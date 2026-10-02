// ---------------------------------------------------------------------------
// Jam engine — pad + drums playing a chord progression on the app-wide
// transport, through a small mixer (volume, mute, solo, reverb send).
// Module level so it survives card mount/unmount and is shared by every Jam
// view (v1 card, v2 card): one pad, one transport listener. Cards are views
// + controls; the chord queue and playing state live in the shared store.
// ---------------------------------------------------------------------------

import { getAudioContext, getMasterGain, getReverbSend } from './engine';
import { createPartChannel, createChorus, createPlateReverb } from './effects';
import type { PartChannel, PlateReverb } from './effects';
import { createPadSynth, PATCHES, DEFAULT_PATCH_ID, getPatch } from './padSynth';
import type { PadSynth, Patch } from './padSynth';
import { onSchedule, atAudibleTime, restartTransport, isTransportRunning, useTransport } from './transport';
import type { TickEvent } from './transport';
import { createDrumKit } from './drumKit';
import type { DrumKit } from './drumKit';
import { grooveHits, isCompound } from '../data/drumGrooves';
import type { GrooveId } from '../data/drumGrooves';
import { createBassSynth } from './bassSynth';
import type { BassSynth } from './bassSynth';
import { chordTones, voiceLead, bassFor, bassPlan, approachNote, parentScale, withIntervals } from '../data/jamHarmony';
import type { Color, BassPattern } from '../data/jamHarmony';
import { getChromaticPosition } from '../data/musicData';
import type { scales } from '../data/musicData';
import { useStore } from '../store/useStore';
import type { JamChord } from '../data/jamAlgorithms';

/** Live-adjustable pad sound. */
export interface PadSettings {
  /** Seconds for each voice to fade silence → peak (gentle bloom). */
  attack: number;
  /** Seconds for the envelope to slump from peak → sustain level. */
  decay: number;
  /** Held level (0–1) relative to peak after decay — note body volume. */
  sustain: number;
  /** Seconds for a voice to fade out when the chord changes (noteOff). */
  release: number;
  /** Seconds between successive notes in the voicing "strum". */
  stagger: number;
  /** Detune in cents applied ±det to the two saw oscillators. */
  detune: number;
  /** Lowpass filter cutoff in Hz — shapes the pad's brightness. */
  cutoff: number;
}

// Slider values come from the patch; stagger stays 0 so every voice hits
// together on the downbeat (positive stagger = strum feel, smears the beat).
// (Reverb isn't part of the sound — it's a send on the mixer.)
export const padDefaultsFor = (patch: Patch): PadSettings => {
  const { attack, decay, sustain, release, detune, cutoff } = patch.defaults;
  return { attack, decay, sustain, release, detune, cutoff, stagger: 0 };
};

// ---- Mixer ----

export type TrackId = 'pad' | 'drums' | 'bass';
export interface TrackMix {
  /** 0–100. */
  volume: number;
  muted: boolean;
  solo: boolean;
  /** Reverb send, 0–1. */
  reverb: number;
}
export type JamMix = Record<TrackId, TrackMix>;

export const DEFAULT_MIX: JamMix = {
  pad: { volume: 80, muted: false, solo: false, reverb: 0.85 },
  drums: { volume: 80, muted: false, solo: false, reverb: 0.15 },
  bass: { volume: 75, muted: false, solo: false, reverb: 0 },
};

/** Each track's level after mute and solo: while any track is soloed, the
 *  others are silent. Mute always wins. */
export const trackGains = (mix: JamMix): Record<TrackId, number> => {
  const anySolo = mix.pad.solo || mix.drums.solo || mix.bass.solo;
  const gain = (t: TrackMix) => (t.muted || (anySolo && !t.solo) ? 0 : t.volume / 100);
  return { pad: gain(mix.pad), drums: gain(mix.drums), bass: gain(mix.bass) };
};

export const PATCH_OPTIONS = PATCHES.map(p => ({ value: p.id, label: p.name }));
export { DEFAULT_PATCH_ID };

// Stop fade-out: fast enough to feel responsive, slow enough to avoid a click.
const STOP_FADE_SEC = 0.15;
// Release used when a chord is swapped mid-bar (sound/key/progression change).
const RETRIGGER_RELEASE_SEC = 0.15;

// ---- Voicing: voice-led chords and a bass that follows ----

let color: Color = 'lush';
let bassPattern: BassPattern = 'bar';
let lastUpper: number[] | null = null;
let lastBass: number | null = null;
/** The chord sounding now (its queue index and bass note) — the bass line
 *  reads it between chord changes. */
let sounding: { chord: JamChord; index: number; bass: number } | null = null;

const rootPc = (chord: JamChord) => getChromaticPosition(chord.note);

/** Voice a chord close to the last one: the upper voices voice-led in a mid
 *  range, plus the root below them (an octave over the bass line). */
const voiceChord = (chord: JamChord): { pad: number[]; bass: number } => {
  const upper = voiceLead(lastUpper, rootPc(chord), chordTones(withIntervals(chord), color));
  const bass = bassFor(lastBass, rootPc(chord));
  let low = bass + 12;
  while (low >= upper[0] - 2) low -= 12;
  lastUpper = upper;
  lastBass = bass;
  return { pad: [low, ...upper], bass };
};

let padChannel: PartChannel | null = null;
let bassChannel: PartChannel | null = null;
let bassVolume: GainNode | null = null;
let bassSynth: BassSynth | null = null;
let plate: PlateReverb | null = null;
let padSynth: PadSynth | null = null;
// Track volume/mute/solo on their own gain nodes so moves are heard instantly.
let padVolume: GainNode | null = null;
let drumChannel: PartChannel | null = null;
let drumVolume: GainNode | null = null;
let drumKit: DrumKit | null = null;
let groove: GrooveId | 'off' = 'off';
// New variations each time the jam starts.
let drumSeed = 1;
let mix: JamMix = DEFAULT_MIX;
let padSettings: PadSettings = padDefaultsFor(getPatch(DEFAULT_PATCH_ID));
let initialized = false;

const perVoiceGain = (voices: number): number => 0.45 / Math.sqrt(Math.max(voices, 1));

const voiceOpts = (p: PadSettings, voices: number, attack = p.attack) => ({
  attack, decay: p.decay, sustain: p.sustain, release: p.release,
  detune: p.detune, cutoff: p.cutoff, gain: perVoiceGain(voices),
});

/** Place the jam's chords on transport beats. Runs ahead with exact audio
 *  times; UI-facing store updates are deferred to when they're heard. */
// Drum feel: hits off the beat drift by up to ±4 ms; the beat stays exact.
const DRUM_FEEL_SEC = 0.004;

/** Schedule this beat's drum hits (the groove places them within the beat). */
const scheduleDrums = (ev: TickEvent, musicBar: number): void => {
  if (groove === 'off' || !drumKit) return;
  const { metronome, jam } = useStore.getState();
  const compound = isCompound(ev.beatsPerBar, metronome.beatUnit);
  grooveHits(groove, {
    beatInBar: ev.beatInBar, beatsPerBar: ev.beatsPerBar, barIndex: musicBar, compound,
    barsPerChord: jam.barsPerChord, seed: drumSeed,
  }).forEach(h => {
    const feel = h.at === 0 ? 0 : (Math.random() * 2 - 1) * DRUM_FEEL_SEC;
    drumKit!.play(h.voice, ev.time + h.at * ev.beatDuration + feel, h.gain);
  });
};

/** Schedule this beat's bass notes, following the chosen pattern. */
const scheduleBass = (ev: TickEvent, musicBar: number): void => {
  if (!bassSynth || !sounding) return;
  const { jam: j, metronome, note } = useStore.getState();
  const compound = isCompound(ev.beatsPerBar, metronome.beatUnit);
  const { chord, index, bass } = sounding;
  const plan = bassPlan(bassPattern, { beatsPerBar: ev.beatsPerBar, compound, barInChord: musicBar % j.barsPerChord, barsPerChord: j.barsPerChord });
  plan.filter(e => e.beat === ev.beatInBar).forEach(e => {
    let midi = bass;
    if (e.kind === 'fifth') {
      midi = bass + (withIntervals(chord).fifth ?? 7);
      if (midi > 52) midi -= 12;
    } else if (e.kind === 'approach') {
      const next = j.chordQueue[index + 1] ?? (j.mode === 'preset' ? j.chordQueue[0] : undefined);
      if (!next) return;
      const root = note.selectedNote ?? 'C';
      const scale = (note.selectedScale ?? 'Major (Ionian)') as keyof typeof scales;
      const scalePcs = parentScale(root, scale).map(getChromaticPosition);
      midi = approachNote(bass, bassFor(bass, rootPc(next)), scalePcs);
    }
    const velocity = e.kind === 'root' ? 0.9 : e.kind === 'fifth' ? 0.7 : 0.65;
    // Short notes stay a little detached; long ones hold nearly to the next.
    const gap = e.beats <= 0.5 ? 0.8 : 0.92;
    bassSynth!.play(midi, ev.time + e.at * ev.beatDuration, e.beats * ev.beatDuration * gap, velocity);
  });
};

const onJamTick = (ev: TickEvent): void => {
  if (ev.subIndex !== 0 || !padSynth) return;
  const { jam: j } = useStore.getState();
  if (!j.isPlaying) return;

  // Count-in is whole bars, so music always starts on a downbeat. Chords
  // change on bar lines (the transport's bars follow the time signature), so
  // a chord always lasts whole bars — 5 beats each in 5/4.
  const musicBar = ev.barIndex - j.countIn;
  if (musicBar < 0) return;
  const isFirst = musicBar === 0;
  const isChordChange = ev.beatInBar === 0 && !isFirst && musicBar % j.barsPerChord === 0;
  const queue = j.chordQueue;
  if (ev.beatInBar === 0 && (isFirst || isChordChange) && queue.length > 0) {
    // `j` is the pre-advance snapshot; the store advance is deferred to
    // audible time for the display, so the audio picks the next chord here.
    const index = isChordChange ? (j.currentChordIndex + 1) % queue.length : j.currentChordIndex;
    if (isChordChange) atAudibleTime(ev.time, () => useStore.getState().advanceJamChord());
    const chord = queue[index];
    if (chord) {
      const { pad, bass } = voiceChord(chord);
      sounding = { chord, index, bass };
      const p = padSettings;
      padSynth.noteOff(ev.time, p.release);
      pad.forEach((midi, i) => padSynth!.noteOn([midi], ev.time + i * p.stagger, voiceOpts(p, pad.length)));
    }
  }
  scheduleDrums(ev, musicBar);
  scheduleBass(ev, musicBar);
};

const ensurePad = (): PartChannel => {
  if (padChannel && padSynth) return padChannel;
  const ctx = getAudioContext();
  // Chorus insert for width, HPF @120 to cut rumble, gentle 400 Hz dip to
  // open up the midrange, reverb send exposed so it can be dialed live. The
  // pad's reverb is its own plate (falls back to the shared room reverb).
  plate = createPlateReverb(ctx, getMasterGain(), getReverbSend());
  padChannel = createPartChannel(ctx, getMasterGain(), plate.input, {
    pan: 0, hpfHz: 120, peakHz: 400, peakGainDb: -2, peakQ: 1.0,
    reverbAmount: mix.pad.reverb,
    insertEffect: createChorus(ctx),
  });
  padVolume = ctx.createGain();
  padVolume.connect(padChannel.input);
  padSynth = createPadSynth(ctx, padVolume, getPatch(DEFAULT_PATCH_ID));
  // Drums share the plate (a touch, for room) and have their own strip.
  drumChannel = createPartChannel(ctx, getMasterGain(), plate.input, { hpfHz: 30, reverbAmount: mix.drums.reverb });
  drumVolume = ctx.createGain();
  drumVolume.connect(drumChannel.input);
  drumKit = createDrumKit(ctx, drumVolume, process.env.PUBLIC_URL ?? '');
  bassChannel = createPartChannel(ctx, getMasterGain(), plate.input, { hpfHz: 30, lpfHz: 2500, reverbAmount: mix.bass.reverb });
  bassVolume = ctx.createGain();
  bassVolume.connect(bassChannel.input);
  bassSynth = createBassSynth(ctx, bassVolume);
  applyMix();
  return padChannel;
};

/** Swap the sounding chord for the store's current chord right now — used
 *  when the sound, key or progression changes mid-chord. */
const retriggerCurrentChord = (): void => {
  const j = useStore.getState().jam;
  if (!j.isPlaying || !isTransportRunning() || !padSynth) return;
  // Still in the count-in — the first chord hasn't sounded yet.
  if (useTransport.getState().barIndex < j.countIn) return;
  const chord = j.chordQueue[j.currentChordIndex];
  if (!chord) return;
  const { pad: voicing, bass } = voiceChord(chord);
  sounding = { chord, index: j.currentChordIndex, bass };
  const now = getAudioContext().currentTime + 0.01;
  padSynth.noteOff(now, RETRIGGER_RELEASE_SEC);
  padSynth.noteOn(voicing, now, voiceOpts(padSettings, voicing.length, Math.min(padSettings.attack, 0.05)));
};

type Store = ReturnType<typeof useStore.getState>;
const configKey = (s: Store) =>
  `${s.jam.mode}|${s.jam.selectedPreset}|${s.jam.progression.join(',')}|${s.jam.algorithm}|${s.note.selectedNote}|${s.note.selectedScale}`;

/** Set up the shared pad and its store watchers. Safe to call from every
 *  Jam view's mount — only the first call does anything. */
export const initJam = (): void => {
  if (initialized) return;
  initialized = true;
  ensurePad();
  // Fetch the drum kit now, even with drums off, so turning drums on (or
  // switching groove) mid-jam is heard on the next beat, not after a download.
  void drumKit?.load().catch(err => console.error(err));
  onSchedule(onJamTick);
  useStore.getState().rebuildJamQueue();
  useStore.subscribe((s, prev) => {
    // Progression, key or scale changed: rebuild, and switch the sounding
    // chord now instead of at the next boundary.
    if (configKey(s) !== configKey(prev)) {
      useStore.getState().rebuildJamQueue();
      retriggerCurrentChord();
    }
    // Linked playback: stopping the metronome anywhere stops the jam too.
    if (prev.metronome.isPlaying && !s.metronome.isPlaying && s.jam.isPlaying) stopJam();
  });
};

export const startJam = (): void => {
  // Always start from the top of the progression.
  useStore.getState().rebuildJamQueue();
  // Fresh pad + restore channel gain (stopJam ducks it to silence).
  const channel = ensurePad();
  const ctx = getAudioContext();
  lastUpper = null;
  lastBass = null;
  sounding = null;
  [channel, drumChannel, bassChannel].forEach(ch => {
    if (!ch) return;
    ch.duckGain.gain.cancelScheduledValues(ctx.currentTime);
    ch.duckGain.gain.setValueAtTime(1, ctx.currentTime);
  });
  // Build the pad's wavetables now, before the clock starts, so the first
  // beats can't be dropped by a stall.
  padSynth?.prepare();
  plate?.restore();
  drumSeed = Math.floor(Math.random() * 2 ** 31);
  // Mark the jam playing before the transport's first tick so beat 0 is
  // scheduled with the jam listening. Restart if the metronome was already
  // running so the count-in starts on a fresh bar.
  useStore.getState().setJamPlaying(true);
  if (isTransportRunning()) restartTransport();
  else useStore.getState().setMetronomePlaying(true);
};

export const stopJam = (): void => {
  // Duck the channel to silence (anti-click), then panic the synth so the
  // oscillators actually stop.
  [padChannel, drumChannel, bassChannel].forEach(ch => {
    if (!ch) return;
    const t0 = getAudioContext().currentTime;
    const g = ch.duckGain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(g.value, t0);
    g.linearRampToValueAtTime(0.0001, t0 + STOP_FADE_SEC);
  });
  padSynth?.panic();
  drumKit?.cancel();
  bassSynth?.panic();
  sounding = null;
  // The plate's tail would ring on for seconds after Stop.
  plate?.silence();
  useStore.getState().setJamPlaying(false);
  useStore.getState().setMetronomePlaying(false);
};

export const getPadSettings = (): PadSettings => padSettings;

/** Apply pad settings; cutoff/detune/sustain retune the chord already
 *  sounding. */
export const setPadSettings = (p: PadSettings): void => {
  padSettings = p;
  padSynth?.update({ cutoff: p.cutoff, detune: p.detune, sustain: p.sustain });
};

/** Switch the pad's sound; returns (and applies) that sound's default settings. */
export const setPadPatch = (id: string): PadSettings => {
  const patch = getPatch(id);
  const next = padDefaultsFor(patch);
  setPadSettings(next);
  // Wavetable sounds switch once their tables are built (in the background).
  padSynth?.setPatch(patch, retriggerCurrentChord);
  return next;
};

const applyMix = (): void => {
  const gains = trackGains(mix);
  const smooth = (p: AudioParam | undefined, v: number) => p?.setTargetAtTime(v, getAudioContext().currentTime, 0.02);
  smooth(padVolume?.gain, gains.pad);
  smooth(drumVolume?.gain, gains.drums);
  smooth(bassVolume?.gain, gains.bass);
  smooth(bassChannel?.sendGain?.gain, mix.bass.reverb);
  smooth(padChannel?.sendGain?.gain, mix.pad.reverb);
  smooth(drumChannel?.sendGain?.gain, mix.drums.reverb);
};

/** Apply the mixer (volume, mute, solo, reverb sends) — heard immediately. */
export const setJamMix = (next: JamMix): void => {
  mix = next;
  applyMix();
};

/** Chord color: triads, 7ths or lush 9ths — heard from the chord sounding now. */
export const setChordColor = (next: Color): void => {
  color = next;
  retriggerCurrentChord();
};

/** Pick the bass pattern. */
export const setBassPattern = (next: BassPattern): void => {
  bassPattern = next;
};

/** Pick the drum groove ('off' for none). */
export const setDrumGroove = (id: GrooveId | 'off'): void => {
  groove = id;
  // Load now if the engine's running; otherwise Play loads it.
  if (id !== 'off') void drumKit?.load().catch(err => console.error(err));
};

/** "Count-in 3" / "Bar 2 of 4" / "Next in 2 beats" from the heard transport
 *  position; null when the jam isn't playing (or hasn't started ticking). */
export const jamCountdownText = (
  jam: { isPlaying: boolean; countIn: number; barsPerChord: number },
  pos: { beatCount: number; barIndex: number; beatInBar: number; beatsPerBar: number },
): string | null => {
  if (!jam.isPlaying || pos.beatCount < 0) return null;
  const musicBar = pos.barIndex - jam.countIn;
  if (musicBar < 0) return `Count-in ${-musicBar * pos.beatsPerBar - pos.beatInBar}`;
  const bar = (musicBar % jam.barsPerChord) + 1;
  if (bar < jam.barsPerChord) return `Bar ${bar} of ${jam.barsPerChord}`;
  const beats = pos.beatsPerBar - pos.beatInBar;
  return `Next in ${beats} ${beats === 1 ? 'beat' : 'beats'}`;
};
