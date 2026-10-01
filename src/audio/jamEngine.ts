// ---------------------------------------------------------------------------
// Jam engine — dreamy pad + chord progression on the app-wide transport.
// Module level so it survives card mount/unmount and is shared by every Jam
// view (v1 card, v2 card): one pad, one transport listener. Cards are views
// + controls; the chord queue and playing state live in the shared store.
// ---------------------------------------------------------------------------

import { getAudioContext, getMasterGain, getReverbSend } from './engine';
import { createPartChannel, createChorus } from './effects';
import type { PartChannel } from './effects';
import { createPadSynth, PATCHES, DEFAULT_PATCH_ID, getPatch } from './padSynth';
import type { PadSynth, Patch } from './padSynth';
import { onSchedule, atAudibleTime, restartTransport, isTransportRunning, useTransport } from './transport';
import type { TickEvent } from './transport';
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
  /** Reverb wet amount, 0 = dry, 1 = full wet send. */
  reverbAmount: number;
}

// Slider values come from the patch; stagger stays 0 so every voice hits
// together on the downbeat (positive stagger = strum feel, smears the beat).
export const padDefaultsFor = (patch: Patch): PadSettings => ({ ...patch.defaults, stagger: 0 });

export const PATCH_OPTIONS = PATCHES.map(p => ({ value: p.id, label: p.name }));
export { DEFAULT_PATCH_ID };

// Stop fade-out: fast enough to feel responsive, slow enough to avoid a click.
const STOP_FADE_SEC = 0.15;
// Release used when a chord is swapped mid-bar (sound/key/progression change).
const RETRIGGER_RELEASE_SEC = 0.15;

/** Close-position voicing: the chord tones plus the root an octave below. */
export const buildSimpleVoicing = (chord: JamChord): number[] => {
  const [root] = chord.midi;
  if (root == null) return [];
  return [root - 12, ...chord.midi];
};

let padChannel: PartChannel | null = null;
let padSynth: PadSynth | null = null;
// Pad volume/mute on its own gain node so slider moves are heard instantly.
let padVolume: GainNode | null = null;
let padSettings: PadSettings = padDefaultsFor(getPatch(DEFAULT_PATCH_ID));
let initialized = false;

const perVoiceGain = (voices: number): number => 0.45 / Math.sqrt(Math.max(voices, 1));

const voiceOpts = (p: PadSettings, voices: number, attack = p.attack) => ({
  attack, decay: p.decay, sustain: p.sustain, release: p.release,
  detune: p.detune, cutoff: p.cutoff, gain: perVoiceGain(voices),
});

/** Place the jam's chords on transport beats. Runs ahead with exact audio
 *  times; UI-facing store updates are deferred to when they're heard. */
const onJamTick = (ev: TickEvent): void => {
  if (ev.subIndex !== 0 || !padSynth) return;
  const { jam: j } = useStore.getState();
  if (!j.isPlaying) return;

  // Count-in is whole bars, so music always starts on a downbeat. Chords
  // change on bar lines (the transport's bars follow the time signature), so
  // a chord always lasts whole bars — 5 beats each in 5/4.
  const musicBar = ev.barIndex - j.countIn;
  if (musicBar < 0 || ev.beatInBar !== 0) return;
  const isFirst = musicBar === 0;
  const isChordChange = !isFirst && musicBar % j.barsPerChord === 0;
  if (!isFirst && !isChordChange) return;

  const queue = j.chordQueue;
  if (queue.length === 0) return;
  // `j` is the pre-advance snapshot; the store advance is deferred to audible
  // time for the display, so the audio picks the next chord here.
  const index = isChordChange ? (j.currentChordIndex + 1) % queue.length : j.currentChordIndex;
  if (isChordChange) atAudibleTime(ev.time, () => useStore.getState().advanceJamChord());

  const chord = queue[index];
  if (!chord) return;
  const voicing = buildSimpleVoicing(chord);
  if (voicing.length === 0) return;
  const p = padSettings;
  padSynth.noteOff(ev.time, p.release);
  voicing.forEach((midi, i) => padSynth!.noteOn([midi], ev.time + i * p.stagger, voiceOpts(p, voicing.length)));
};

const ensurePad = (): PartChannel => {
  if (padChannel && padSynth) return padChannel;
  const ctx = getAudioContext();
  // Chorus insert for width, HPF @120 to cut rumble, gentle 400 Hz dip to
  // open up the midrange, reverb send exposed so it can be dialed live.
  padChannel = createPartChannel(ctx, getMasterGain(), getReverbSend(), {
    pan: 0, hpfHz: 120, peakHz: 400, peakGainDb: -2, peakQ: 1.0,
    reverbAmount: padSettings.reverbAmount,
    insertEffect: createChorus(ctx),
  });
  padVolume = ctx.createGain();
  padVolume.connect(padChannel.input);
  padSynth = createPadSynth(ctx, padVolume, getPatch(DEFAULT_PATCH_ID));
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
  const voicing = buildSimpleVoicing(chord);
  if (voicing.length === 0) return;
  const now = getAudioContext().currentTime + 0.01;
  padSynth.noteOff(now, RETRIGGER_RELEASE_SEC);
  padSynth.noteOn(voicing, now, voiceOpts(padSettings, voicing.length, Math.min(padSettings.attack, 0.05)));
};

type Store = ReturnType<typeof useStore.getState>;
const configKey = (s: Store) =>
  `${s.jam.mode}|${s.jam.selectedPreset}|${s.jam.algorithm}|${s.note.selectedNote}|${s.note.selectedScale}`;

/** Set up the shared pad and its store watchers. Safe to call from every
 *  Jam view's mount — only the first call does anything. */
export const initJam = (): void => {
  if (initialized) return;
  initialized = true;
  ensurePad();
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
  channel.duckGain.gain.cancelScheduledValues(ctx.currentTime);
  channel.duckGain.gain.setValueAtTime(1, ctx.currentTime);
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
  if (padChannel) {
    const t0 = getAudioContext().currentTime;
    const g = padChannel.duckGain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(g.value, t0);
    g.linearRampToValueAtTime(0.0001, t0 + STOP_FADE_SEC);
  }
  padSynth?.panic();
  useStore.getState().setJamPlaying(false);
  useStore.getState().setMetronomePlaying(false);
};

export const getPadSettings = (): PadSettings => padSettings;

/** Apply pad settings; cutoff/detune/sustain and reverb retune the chord
 *  already sounding. */
export const setPadSettings = (p: PadSettings): void => {
  padSettings = p;
  padSynth?.update({ cutoff: p.cutoff, detune: p.detune, sustain: p.sustain });
  if (padChannel?.sendGain) padChannel.sendGain.gain.setTargetAtTime(p.reverbAmount, getAudioContext().currentTime, 0.02);
};

/** Switch the pad's sound; returns (and applies) that sound's default settings. */
export const setPadPatch = (id: string): PadSettings => {
  const patch = getPatch(id);
  const next = padDefaultsFor(patch);
  padSynth?.setPatch(patch);
  setPadSettings(next);
  retriggerCurrentChord();
  return next;
};

/** Pad volume (0–100) and mute, applied to the chord already sounding. */
export const setPadVolume = (volume: number, muted: boolean): void => {
  if (!padVolume) return;
  padVolume.gain.setTargetAtTime(muted ? 0 : volume / 100, padVolume.context.currentTime, 0.02);
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
