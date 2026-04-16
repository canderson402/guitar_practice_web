import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { majorProgressions, minorProgressions } from '../data/musicData';
import type { JamAlgorithm, JamChord } from '../data/jamAlgorithms';
import {
  createScheduler,
  setMasterVolume,
  getAudioContext, getMasterGain, getReverbSend,
  createPartChannel, createChorus,
  createPadSynth,
  scheduleClick, loadClickSamples,
} from '../audio';
import type { Scheduler, PartChannel, PadSynth } from '../audio';
import { Button, Select, Checkbox, ToggleButtonGroup } from '../ui';
import './JamCard.css';

// ---------------------------------------------------------------------------
// Jam Mode = dreamy pad + chord progression.
// No drums, no bass, no strum — just a pad blooming through chord changes
// while the metronome (its own component) ticks over the top.
// ---------------------------------------------------------------------------

const MINOR_SCALES = new Set([
  'Aeolian (Natural Minor)', 'Dorian', 'Phrygian', 'Locrian',
  'Harmonic Minor', 'Minor Pentatonic',
]);

const ALGORITHM_OPTIONS: { value: JamAlgorithm; label: string; group: string }[] = [
  { value: 'fifths',           label: 'Fifths',            group: 'Chromatic' },
  { value: 'fourths',          label: 'Fourths',           group: 'Chromatic' },
  { value: 'skip1',            label: 'Skip 1 (whole tone)', group: 'Chromatic' },
  { value: 'skip2',            label: 'Skip 2 (minor 3rds)', group: 'Chromatic' },
  { value: 'diatonic-fifths',  label: 'Diatonic Fifths',   group: 'Diatonic' },
  { value: 'diatonic-fourths', label: 'Diatonic Fourths',  group: 'Diatonic' },
  { value: 'diatonic-thirds',  label: 'Diatonic Thirds',   group: 'Diatonic' },
  { value: 'ii-v',             label: 'ii-V Pairs',        group: 'Diatonic' },
  { value: 'random',           label: 'Random',            group: 'Diatonic' },
];

const ALGORITHM_GROUPS = (() => {
  const groupMap = new Map<string, { value: string; label: string }[]>();
  for (const opt of ALGORITHM_OPTIONS) {
    if (!groupMap.has(opt.group)) groupMap.set(opt.group, []);
    groupMap.get(opt.group)!.push({ value: opt.value, label: opt.label });
  }
  return Array.from(groupMap.entries()).map(([label, options]) => ({ label, options }));
})();

const MAJOR_PRESET_OPTIONS = Object.keys(majorProgressions).map(n => ({ value: n, label: n }));
const MINOR_PRESET_OPTIONS = Object.keys(minorProgressions).map(n => ({ value: n, label: n }));

// Stop fade-out: how fast the pad channel drops to silence when you press
// Stop. Short enough to feel responsive, long enough to avoid a click.
const STOP_FADE_SEC = 0.15;

/**
 * Simple close-position voicing: root, 3rd, 5th (and any extra chord tones
 * already in chord.midi) all in their base octave, plus a bass note one
 * octave below the root. Predictable and consonant — no voice-leading
 * octave shuffling that can produce harsh clusters, no drop-2 spread, no
 * added 7ths or spice notes.
 */
const buildSimpleVoicing = (chord: JamChord): number[] => {
  const [root] = chord.midi;
  if (root == null) return [];
  return [root - 12, ...chord.midi];
};

// ---- Live-adjustable pad settings ----
// Exposed in the UI. Kept in a React ref so the (module-level) scheduler
// callback always reads the latest values without re-subscribing.
interface PadSettings {
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
  /** Detune in cents applied ±det to the two saw oscillators. 0 = unison,
   *  10–20 = classic chorus/pad width. */
  detune: number;
  /** Lowpass filter cutoff in Hz — shapes the pad's brightness. */
  cutoff: number;
  /** Reverb wet amount, 0 = dry, 1 = full wet send. */
  reverbAmount: number;
}

const DEFAULT_PAD: PadSettings = {
  // Fast attack so the chord lands AT the downbeat, not smeared after it.
  // Crank higher for slow-bloom pads, but anything over ~0.15s will make
  // chord changes feel late relative to the click.
  attack:       0.05,
  decay:        1.50,
  sustain:      0.80,
  // Long-ish release so the old chord tail overlaps the new chord's body —
  // smooth crossfade without a perceptible gap.
  release:      1.80,
  // Zero stagger so all voices hit together on the downbeat. Positive
  // stagger creates a 'strum' feel but smears the beat.
  stagger:      0.000,
  detune:       12,
  cutoff:       2000,
  reverbAmount: 0.65,
};

// ---------------------------------------------------------------------------
// Module-level refs — survive card mount/unmount
// ---------------------------------------------------------------------------

let moduleScheduler: Scheduler | null = null;
let padChannel: PartChannel | null = null;
let padSynth: PadSynth | null = null;

const ensurePad = (): { channel: PartChannel; synth: PadSynth } => {
  if (padChannel && padSynth) return { channel: padChannel, synth: padSynth };
  const ctx = getAudioContext();
  const master = getMasterGain();
  const reverb = getReverbSend();

  // Chorus insert for width, HPF @120 to cut rumble, gentle 400 Hz dip to
  // open up the midrange, reverb send exposed so we can dial it live.
  padChannel = createPartChannel(ctx, master, reverb, {
    pan: 0,
    hpfHz: 120,
    peakHz: 400,
    peakGainDb: -2,
    peakQ: 1.0,
    reverbAmount: DEFAULT_PAD.reverbAmount,
    insertEffect: createChorus(ctx),
  });

  // The synth dumps every voice into the pad channel's input.
  padSynth = createPadSynth(ctx, padChannel.input);

  return { channel: padChannel, synth: padSynth };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const JamCard: React.FC = () => {
  const {
    jam, note, metronome,
    setJamMode, setJamPlaying, setJamPreset, setJamAlgorithm,
    setJamBarsPerChord,
    setJamMixerVolume, setJamMixerMuted,
    rebuildJamQueue, setMetronomePlaying, setMetronomeMuted,
    setBpm, setCurrentBeat,
  } = useStore();

  // Pad settings — source of truth for UI lives in React state. The
  // scheduler (module-level, long-lived closure) reads from the ref to
  // always see the latest values without having to be re-created.
  const [pad, setPad] = useState<PadSettings>(DEFAULT_PAD);
  const padRef = useRef<PadSettings>(pad);
  useEffect(() => { padRef.current = pad; }, [pad]);

  // Show/hide the pad settings panel.
  const [showPadSettings, setShowPadSettings] = useState(false);

  // Wire up the pad channel + synth on mount, and kick off click-sample
  // loading so the scheduler can fire them in sync from the first beat.
  useEffect(() => {
    ensurePad();
    loadClickSamples();
  }, []);

  // Apply master volume on mount and whenever the slider changes
  useEffect(() => {
    setMasterVolume(jam.mixer.master.volume / 100);
  }, [jam.mixer.master.volume]);

  // Live-update reverb send when the slider moves.
  useEffect(() => {
    const ch = padChannel;
    if (!ch?.sendGain) return;
    const ctx = getAudioContext();
    ch.sendGain.gain.setTargetAtTime(pad.reverbAmount, ctx.currentTime, 0.02);
  }, [pad.reverbAmount]);

  // Rebuild queue on config changes
  const rebuildDepsKey = `${jam.mode}|${jam.selectedPreset}|${jam.algorithm}|${note.selectedNote}|${note.selectedScale}`;
  useEffect(() => {
    rebuildJamQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebuildDepsKey]);

  // Keep scheduler BPM in sync
  useEffect(() => {
    if (moduleScheduler?.isRunning()) {
      moduleScheduler.setBpm(metronome.bpm);
    }
  }, [metronome.bpm]);

  // If the metronome gets stopped from outside (e.g. its own Stop button),
  // stop the jam too — the user wants them linked: "if one is running
  // the other one is running". Handled via a ref so we don't need to put
  // stopPlayback in the dep array (which would re-run on every render).
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!metronome.isPlaying && jam.isPlaying) {
      stopRef.current();
    }
  }, [metronome.isPlaying, jam.isPlaying]);

  // ---- Playback ----

  const startPlayback = useCallback(() => {
    if (moduleScheduler?.isRunning()) return;

    // Fresh pad + restore channel gain (stopPlayback ducks it to silence).
    const { channel, synth } = ensurePad();
    const ctx = getAudioContext();
    channel.duckGain.gain.cancelScheduledValues(ctx.currentTime);
    channel.duckGain.gain.setValueAtTime(1, ctx.currentTime);

    const scheduler = createScheduler(metronome.bpm, (beatIndex, audioTime) => {
      const state = useStore.getState();
      const j = state.jam;
      const m = state.metronome;
      const mx = j.mixer;
      const beatsPerBar = m.beatsPerMeasure;
      const beatsPerChord = j.barsPerChord * beatsPerBar;
      const beatInBar = beatIndex % beatsPerBar;
      const beatInChord = beatIndex % beatsPerChord;
      const p = padRef.current;

      // Drive the metronome click here too — both chord changes and clicks
      // share the same audio-time schedule, so they can never drift. Clicks
      // fire on every beat (quarter-note granularity).
      scheduleClick(audioTime, {
        soundType: m.soundType,
        muted: m.muted,
        isAccent: true,             // every beat is a downbeat at quarter granularity
        isFirstBeat: beatInBar === 0,
        emphasizeFirstBeat: m.emphasizeFirstBeat,
      });

      // Update the UI synchronously. Scheduler fires ~100 ms before audio
      // hits, so dots + chord label visually *lead* the click by that much
      // — uniform, imperceptible. Previously this was delayed via setTimeout
      // to match audioTime, but setTimeout jitter under main-thread load
      // (React re-renders triggered by the store updates themselves) made
      // the visual land inconsistently late — felt like an extra 8th/16th
      // note of hesitation before each chord changeover.
      const isChordChange = beatInChord === 0 && beatIndex > 0;
      const s = useStore.getState();
      s.setCurrentBeat(beatInBar);
      if (isChordChange) s.advanceJamChord();

      // Pad only triggers on chord boundaries — voices sustain the rest of
      // the time. First beat of playback (beatIndex===0) kicks off the
      // initial chord; later chord-change beats do the crossfade.
      const isFirstBeat = beatIndex === 0;
      if (!isFirstBeat && !isChordChange) return;
      if (mx.chords.muted) return;

      // Which chord? isChordChange peeks the next queue slot (store advance
      // is deferred to audioTime above).
      const queue = j.chordQueue;
      if (queue.length === 0) return;
      const voicingIndex = isChordChange
        ? (j.currentChordIndex + 1) % queue.length
        : j.currentChordIndex;
      const currentChord = queue[voicingIndex];
      if (!currentChord) return;

      const voicing = buildSimpleVoicing(currentChord);
      if (voicing.length === 0) return;

      const vol = mx.chords.volume / 100;
      // Per-voice gain: divide by a polyphony-ish factor so 4 voices don't
      // clip. Square root scales apparent loudness more naturally than /N.
      const perVoiceGain = (vol * 0.45) / Math.sqrt(Math.max(voicing.length, 1));

      // Release held voices (if any) and start the new voicing. Old voices
      // fade out over `release` while new voices fade in over `attack` —
      // natural crossfade across the chord boundary.
      synth.noteOff(audioTime, p.release);
      voicing.forEach((midi, i) => {
        synth.noteOn([midi], audioTime + i * p.stagger, {
          attack: p.attack,
          decay: p.decay,
          sustain: p.sustain,
          release: p.release,
          detune: p.detune,
          cutoff: p.cutoff,
          gain: perVoiceGain,
        });
      });
    });

    moduleScheduler = scheduler;
    scheduler.start();
    setJamPlaying(true);
    setMetronomePlaying(true);
  }, [metronome.bpm, setJamPlaying, setMetronomePlaying]);

  const stopPlayback = useCallback(() => {
    // Cut pad audio immediately: duck the whole channel to silence over
    // STOP_FADE_SEC (anti-click), then panic the synth to kill oscillators.
    const ch = padChannel;
    if (ch) {
      const ctx = getAudioContext();
      const t0 = ctx.currentTime;
      const g = ch.duckGain.gain;
      g.cancelScheduledValues(t0);
      g.setValueAtTime(g.value, t0);
      g.linearRampToValueAtTime(0.0001, t0 + STOP_FADE_SEC);
    }
    // Kill every live voice so the oscillators actually stop running (the
    // channel duck above just silences them downstream).
    padSynth?.panic();
    moduleScheduler?.stop();
    moduleScheduler = null;
    setJamPlaying(false);
    setMetronomePlaying(false);
    setCurrentBeat(0);
  }, [setJamPlaying, setMetronomePlaying, setCurrentBeat]);

  // Keep the ref pointing at the latest stopPlayback so the linkage effect
  // above can call it without capturing a stale closure.
  useEffect(() => { stopRef.current = stopPlayback; }, [stopPlayback]);

  // ---- Derived ----

  const handleBpmChange = (delta: number) => {
    setBpm(Math.max(40, Math.min(300, metronome.bpm + delta)));
  };

  const isMinorScale = MINOR_SCALES.has(note.selectedScale ?? '');
  const presetOptions = isMinorScale ? MINOR_PRESET_OPTIONS : MAJOR_PRESET_OPTIONS;

  const currentChord = jam.chordQueue[jam.currentChordIndex] ?? null;
  const nextChord = jam.chordQueue[jam.currentChordIndex + 1] ??
    (jam.mode === 'preset' && jam.chordQueue.length > 0 ? jam.chordQueue[0] : null);
  const upcomingChords = jam.chordQueue.slice(jam.currentChordIndex + 2, jam.currentChordIndex + 6);

  const canPlay = jam.mode === 'infinite' || (jam.mode === 'preset' && jam.selectedPreset !== null);

  // ---- Render helpers ----

  /** Labelled slider row — used by the pad settings panel. */
  const padSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
    format: (v: number) => string = v => v.toFixed(2),
  ) => (
    <div className="jam-mixer-row">
      <span className="jam-mixer-label" style={{ minWidth: '7rem' }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="jam-mixer-slider"
      />
      <span className="jam-mixer-label" style={{ minWidth: '3.2rem', textAlign: 'right' }}>
        {format(value)}
      </span>
    </div>
  );

  // ---- Render ----

  return (
    <div className="jam-card">
      {/* Mode toggle */}
      <ToggleButtonGroup label="Jam mode" layout="segmented">
        <Button variant="outline" size="sm" active={jam.mode === 'preset'} onClick={() => setJamMode('preset')}>Preset</Button>
        <Button variant="outline" size="sm" active={jam.mode === 'infinite'} onClick={() => setJamMode('infinite')}>Infinite</Button>
      </ToggleButtonGroup>

      {/* Mode-specific picker */}
      {jam.mode === 'preset' ? (
        <Select
          size="sm"
          value={jam.selectedPreset ?? ''}
          onChange={(e) => setJamPreset(e.target.value || null)}
          options={[{ value: '', label: '— choose progression —', disabled: true }, ...presetOptions]}
        />
      ) : (
        <Select size="sm" value={jam.algorithm} onChange={(e) => setJamAlgorithm(e.target.value as JamAlgorithm)} groups={ALGORITHM_GROUPS} />
      )}

      {/* Chord display */}
      <div className="jam-chord-display">
        <div className="jam-main-chords">
          <div className="jam-current-chord">
            <div className="jam-chord-label">CURRENT</div>
            {currentChord ? (
              <>
                <div className="jam-chord-note">{currentChord.note}{currentChord.symbol}</div>
                <div className="jam-chord-roman">{currentChord.roman}</div>
              </>
            ) : (
              <div className="jam-chord-note jam-chord-empty">—</div>
            )}
          </div>
          {nextChord && (
            <>
              <div className="jam-arrow">→</div>
              <div className="jam-next-chord">
                <div className="jam-chord-label">NEXT</div>
                <div className="jam-chord-note">{nextChord.note}{nextChord.symbol}</div>
                <div className="jam-chord-roman">{nextChord.roman}</div>
              </div>
            </>
          )}
        </div>
        {upcomingChords.length > 0 && (
          <div className="jam-upcoming">
            {upcomingChords.map((chord, i) => (
              <div key={`${jam.currentChordIndex}-${i}`} className="jam-upcoming-item" style={{ opacity: 0.7 - i * 0.15 }}>
                <span className="jam-upcoming-note">{chord.note}{chord.symbol}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mixer — Master + Pad volume + Metronome-click mute */}
      <div className="jam-mixer">
        <div className="jam-mixer-row jam-mixer-row--master">
          <span className="jam-mixer-label">Master</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={jam.mixer.master.volume}
            onChange={(e) => setJamMixerVolume('master', Number(e.target.value))}
            list="jam-mixer-ticks"
            className="jam-mixer-slider"
          />
        </div>
        <div className="jam-mixer-row">
          <Checkbox
            checked={!jam.mixer.chords.muted}
            onCheckedChange={(checked) => setJamMixerMuted('chords', !checked)}
            label="Pad"
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={jam.mixer.chords.volume}
            onChange={(e) => setJamMixerVolume('chords', Number(e.target.value))}
            disabled={jam.mixer.chords.muted}
            list="jam-mixer-ticks"
            className="jam-mixer-slider"
          />
        </div>
        <div className="jam-mixer-row">
          <Checkbox
            checked={!metronome.muted}
            onCheckedChange={(checked) => setMetronomeMuted(!checked)}
            label="Metronome click"
          />
        </div>
        <datalist id="jam-mixer-ticks">
          <option value="0" />
          <option value="50" />
          <option value="100" />
        </datalist>
      </div>

      {/* Pad settings — collapsible */}
      <div className="jam-mixer">
        <div className="jam-mixer-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPadSettings(s => !s)}
          >
            {showPadSettings ? '▾ Pad settings' : '▸ Pad settings'}
          </Button>
          {showPadSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPad(DEFAULT_PAD)}
              title="Reset pad settings to defaults"
            >
              Reset
            </Button>
          )}
        </div>
        {showPadSettings && (
          <>
            {padSlider('Attack',   pad.attack,   0, 4,    0.05, v => setPad(p => ({ ...p, attack: v })),   v => `${v.toFixed(2)}s`)}
            {padSlider('Decay',    pad.decay,    0, 10,   0.1,  v => setPad(p => ({ ...p, decay: v })),    v => `${v.toFixed(1)}s`)}
            {padSlider('Sustain',  pad.sustain,  0, 1,    0.02, v => setPad(p => ({ ...p, sustain: v })),  v => `${(v*100).toFixed(0)}%`)}
            {padSlider('Release',  pad.release,  0, 10,   0.1,  v => setPad(p => ({ ...p, release: v })),  v => `${v.toFixed(1)}s`)}
            {padSlider('Stagger',  pad.stagger,  0, 0.2,  0.005, v => setPad(p => ({ ...p, stagger: v })), v => `${(v*1000).toFixed(0)}ms`)}
            {padSlider('Detune',   pad.detune,   0, 50,   1,    v => setPad(p => ({ ...p, detune: v })),   v => `${v.toFixed(0)}¢`)}
            {padSlider('Cutoff',   pad.cutoff,   200, 8000, 50, v => setPad(p => ({ ...p, cutoff: v })),   v => `${v.toFixed(0)}Hz`)}
            {padSlider('Reverb',   pad.reverbAmount, 0, 1.5, 0.05, v => setPad(p => ({ ...p, reverbAmount: v })))}
          </>
        )}
      </div>

      {/* BPM */}
      <div className="jam-bpm-row">
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(-5)}>−5</Button>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(-1)}>−1</Button>
        <div className="jam-bpm-display">
          <span className="jam-bpm-value">{metronome.bpm}</span>
          <span className="jam-bpm-label">BPM</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(1)}>+1</Button>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(5)}>+5</Button>
      </div>

      {/* Bars per chord */}
      <div className="jam-controls-row">
        <label className="ds-label-inline">Bars/chord:</label>
        <input
          type="number"
          min={1}
          max={16}
          value={jam.barsPerChord}
          onChange={(e) => setJamBarsPerChord(Number(e.target.value) || 2)}
          className="jam-beats-input"
        />
      </div>

      {/* Play/Stop */}
      <Button
        variant={jam.isPlaying ? 'danger' : 'primary'}
        disabled={!canPlay}
        onClick={jam.isPlaying ? stopPlayback : startPlayback}
      >
        {jam.isPlaying ? 'Stop' : 'Play'}
      </Button>
    </div>
  );
};
