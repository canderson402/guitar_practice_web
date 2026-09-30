import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { majorProgressions, minorProgressions } from '../data/musicData';
import type { JamAlgorithm } from '../data/jamAlgorithms';
import { setMasterVolume, loadClickSamples, setClickVolume, useTransport } from '../audio';
import {
  initJam, startJam, stopJam, jamCountdownText, getPadSettings, setPadSettings, setPadPatch, setPadVolume,
  padDefaultsFor, PATCH_OPTIONS, DEFAULT_PATCH_ID,
} from '../audio/jamEngine';
import type { PadSettings } from '../audio/jamEngine';
import { getPatch } from '../audio/padSynth';
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

/** Countdown from the shared engine; the only part of the card that
 *  re-renders per beat. */
const JamCountdown: React.FC = () => {
  const jam = useStore(useShallow(s => ({ isPlaying: s.jam.isPlaying, countIn: s.jam.countIn, barsPerChord: s.jam.barsPerChord })));
  const pos = useTransport(useShallow(s => ({ beatCount: s.beatCount, barIndex: s.barIndex, beatInBar: s.beatInBar, beatsPerBar: s.beatsPerBar })));
  const text = jamCountdownText(jam, pos);
  if (!text) return null;
  const className = `jam-countdown${text.startsWith('Count-in') ? ' jam-countdown--countin' : text.startsWith('Next') ? ' jam-countdown--final' : ''}`;
  return <div className={className}><span>{text}</span></div>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const JamCard: React.FC = () => {
  const jam = useStore(s => s.jam);
  const note = useStore(useShallow(s => ({
    selectedNote: s.note.selectedNote,
    selectedScale: s.note.selectedScale,
  })));
  const metronome = useStore(useShallow(s => ({
    bpm: s.metronome.bpm,
    muted: s.metronome.muted,
    volume: s.metronome.volume,
    isPlaying: s.metronome.isPlaying,
  })));
  const {
    setJamMode, setJamPreset, setJamAlgorithm,
    setJamBarsPerChord, setJamCountIn,
    setJamMixerVolume, setJamMixerMuted,
    setMetronomeMuted, setMetronomeVolume,
    setBpm,
  } = useStore(useShallow(s => ({
    setJamMode: s.setJamMode,
    setJamPreset: s.setJamPreset,
    setJamAlgorithm: s.setJamAlgorithm,
    setJamBarsPerChord: s.setJamBarsPerChord,
    setJamCountIn: s.setJamCountIn,
    setJamMixerVolume: s.setJamMixerVolume,
    setJamMixerMuted: s.setJamMixerMuted,
    setMetronomeMuted: s.setMetronomeMuted,
    setMetronomeVolume: s.setMetronomeVolume,
    setBpm: s.setBpm,
  })));

  // Pad settings — the UI's copy lives in React state and is pushed to the
  // shared engine (which retunes the sounding chord live).
  const [patchId, setPatchId] = useState<string>(DEFAULT_PATCH_ID);
  const [pad, setPad] = useState<PadSettings>(() => getPadSettings());
  useEffect(() => { setPadSettings(pad); }, [pad]);

  // Show/hide the pad settings panel.
  const [showPadSettings, setShowPadSettings] = useState(false);

  // Wire up the pad channel + synth on mount, and kick off click-sample
  // loading so the transport can fire them from the first beat.
  useEffect(() => {
    initJam();
    loadClickSamples();
  }, []);

  // Apply master volume on mount and whenever the slider changes
  useEffect(() => {
    setMasterVolume(jam.mixer.master.volume / 100);
  }, [jam.mixer.master.volume]);

  // Pad volume + mute — applied to the chord already sounding.
  useEffect(() => {
    setPadVolume(jam.mixer.chords.volume, jam.mixer.chords.muted);
  }, [jam.mixer.chords.volume, jam.mixer.chords.muted]);

  // Metronome click volume — applies instantly via the shared click bus.
  useEffect(() => {
    setClickVolume(metronome.volume / 100);
  }, [metronome.volume]);

  const handlePatchChange = (id: string) => {
    setPatchId(id);
    setPad(setPadPatch(id));
  };

  // Queue rebuilds on key/progression changes and the metronome link live
  // in the shared engine (initJam).
  const stopPlayback = stopJam;
  const startPlayback = startJam;

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
        <JamCountdown />
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
            label="Click"
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={metronome.volume}
            onChange={(e) => setMetronomeVolume(Number(e.target.value))}
            disabled={metronome.muted}
            list="jam-mixer-ticks"
            className="jam-mixer-slider"
            aria-label="Metronome click volume"
          />
        </div>
        <datalist id="jam-mixer-ticks">
          <option value="0" />
          <option value="50" />
          <option value="100" />
        </datalist>
      </div>

      {/* Pad sound + settings — collapsible */}
      <div className="jam-mixer">
        <div className="jam-mixer-row">
          <span className="jam-mixer-label">Sound</span>
          <Select
            size="sm"
            value={patchId}
            onChange={(e) => handlePatchChange(e.target.value)}
            options={PATCH_OPTIONS}
          />
        </div>
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
              onClick={() => setPad(padDefaultsFor(getPatch(patchId)))}
              title="Reset pad settings to this sound's defaults"
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

      {/* Bars per chord + Count-in */}
      <div className="jam-controls-row">
        <label className="ds-label-inline">Bars/chord:</label>
        <input
          type="number"
          min={1}
          max={16}
          value={jam.barsPerChord}
          onChange={(e) => setJamBarsPerChord(Number(e.target.value) || 4)}
          className="jam-beats-input"
        />
        <label className="ds-label-inline">Count-in:</label>
        <Select
          size="sm"
          value={jam.countIn}
          onChange={(e) => setJamCountIn(Number(e.target.value))}
          disabled={jam.isPlaying}
          options={[
            { value: '0', label: 'None' },
            { value: '1', label: '1 bar' },
            { value: '2', label: '2 bars' },
          ]}
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
