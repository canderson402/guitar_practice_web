import React, { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { majorProgressions, minorProgressions } from '../data/musicData';
import { drumPatterns } from '../data/jamAlgorithms';
import type { JamAlgorithm, DrumPatternName } from '../data/jamAlgorithms';
import { createScheduler, playChord, playKick, playSnare, playHat } from '../audio';
import type { Scheduler } from '../audio';
import { Button, Select, Checkbox, ToggleButtonGroup } from '../ui';
import './JamCard.css';

// ---------------------------------------------------------------------------
// Minor scales — presets pick from minorProgressions when these are active
// ---------------------------------------------------------------------------

const MINOR_SCALES = new Set([
  'Aeolian (Natural Minor)',
  'Dorian',
  'Phrygian',
  'Locrian',
  'Harmonic Minor',
  'Minor Pentatonic',
]);

// ---------------------------------------------------------------------------
// Algorithm Select options
// ---------------------------------------------------------------------------

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

// Build grouped Select options
const ALGORITHM_GROUPS = (() => {
  const groupMap = new Map<string, { value: string; label: string }[]>();
  for (const opt of ALGORITHM_OPTIONS) {
    if (!groupMap.has(opt.group)) groupMap.set(opt.group, []);
    groupMap.get(opt.group)!.push({ value: opt.value, label: opt.label });
  }
  return Array.from(groupMap.entries()).map(([label, options]) => ({ label, options }));
})();

// ---------------------------------------------------------------------------
// Preset options
// ---------------------------------------------------------------------------

const MAJOR_PRESET_OPTIONS = Object.keys(majorProgressions).map(name => ({
  value: name,
  label: name,
}));

const MINOR_PRESET_OPTIONS = Object.keys(minorProgressions).map(name => ({
  value: name,
  label: name,
}));

// ---------------------------------------------------------------------------
// Drum pattern options
// ---------------------------------------------------------------------------

const DRUM_PATTERN_OPTIONS: { value: DrumPatternName; label: string }[] = [
  { value: 'rock',   label: 'Rock' },
  { value: 'bossa',  label: 'Bossa' },
  { value: 'hiphop', label: 'Hip-hop' },
];

// ---------------------------------------------------------------------------
// Beats-per-chord options
// ---------------------------------------------------------------------------

const BEATS_PER_CHORD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
  value: String(n),
  label: String(n),
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const JamCard: React.FC = () => {
  const {
    jam, note,
    setJamMode, setJamPlaying, setJamBpm, setJamPreset, setJamAlgorithm,
    setJamDrumsEnabled, setJamDrumPattern, setJamBeatsPerChord, setJamSyncMetronome,
    rebuildJamQueue, setMetronomePlaying, setBpm, setCurrentBeat,
  } = useStore();

  const schedulerRef = useRef<Scheduler | null>(null);

  // -------------------------------------------------------------------------
  // Rebuild queue whenever mode/preset/algorithm/key/scale changes.
  // Use a string dep to avoid object reference churn.
  // -------------------------------------------------------------------------
  const rebuildDepsKey = `${jam.mode}|${jam.selectedPreset}|${jam.algorithm}|${note.selectedNote}|${note.selectedScale}`;

  useEffect(() => {
    rebuildJamQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebuildDepsKey]);

  // -------------------------------------------------------------------------
  // BPM sync while playing
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (schedulerRef.current) {
      schedulerRef.current.setBpm(jam.bpm);
    }
  }, [jam.bpm]);

  // -------------------------------------------------------------------------
  // Playback controls
  // -------------------------------------------------------------------------

  const startPlayback = useCallback(() => {
    if (schedulerRef.current?.isRunning()) return;

    const scheduler = createScheduler(jam.bpm, (beatIndex, audioTime) => {
      // Always read fresh state — this callback fires outside React lifecycle.
      const state = useStore.getState();
      const j = state.jam;
      const beatsPerBar = 4;
      const beatInBar = beatIndex % beatsPerBar;
      const beatInChord = beatIndex % j.beatsPerChord;

      // Update metronome beat display
      if (j.syncMetronome) {
        state.setCurrentBeat(beatInBar);
      }

      // Chord handling on first beat of each chord group
      if (beatInChord === 0) {
        // Advance first (skip beat 0 — rebuildJamQueue already set chord 0)
        if (beatIndex > 0) {
          state.advanceJamChord();
        }
        // Read fresh state AFTER advance
        const fresh = useStore.getState();
        const currentChord = fresh.jam.chordQueue[fresh.jam.currentChordIndex];
        if (currentChord) {
          const chordDuration = (60 / j.bpm) * j.beatsPerChord * 0.9;
          playChord(currentChord.midi, chordDuration, audioTime, {
            gain: 0.2,
            waveform: 'sawtooth',
            brightness: 0.3,
          });
        }
      }

      // Play drums
      if (j.drumsEnabled) {
        const pattern = drumPatterns[j.drumPattern];
        const beatDuration = 60 / j.bpm;
        for (const hit of pattern) {
          const hitBeat = Math.floor(hit.position);
          const hitOffset = hit.position - hitBeat;
          if (hitBeat === beatInBar) {
            const hitTime = audioTime + hitOffset * beatDuration;
            switch (hit.instrument) {
              case 'kick':  playKick(hitTime, hit.gain);        break;
              case 'snare': playSnare(hitTime, hit.gain);       break;
              case 'hat':   playHat(hitTime, true, hit.gain);   break;
            }
          }
        }
      }
    });

    schedulerRef.current = scheduler;
    scheduler.start();
    setJamPlaying(true);

    if (jam.syncMetronome) {
      setBpm(jam.bpm);
      setMetronomePlaying(true);
    }
  }, [jam.bpm, jam.syncMetronome, setJamPlaying, setMetronomePlaying, setBpm]);

  const stopPlayback = useCallback(() => {
    schedulerRef.current?.stop();
    schedulerRef.current = null;
    setJamPlaying(false);

    if (jam.syncMetronome) {
      setMetronomePlaying(false);
      setCurrentBeat(0);
    }
  }, [jam.syncMetronome, setJamPlaying, setMetronomePlaying, setCurrentBeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      schedulerRef.current?.stop();
      schedulerRef.current = null;
    };
  }, []);

  // -------------------------------------------------------------------------
  // BPM nudge
  // -------------------------------------------------------------------------
  const handleBpmChange = (delta: number) => {
    setJamBpm(jam.bpm + delta);
  };

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const isMinorScale = MINOR_SCALES.has(note.selectedScale ?? '');
  const presetOptions = isMinorScale ? MINOR_PRESET_OPTIONS : MAJOR_PRESET_OPTIONS;

  const currentChord = jam.chordQueue[jam.currentChordIndex] ?? null;

  // Up to 5 upcoming chords (after the current one)
  const upcomingChords = jam.chordQueue.slice(
    jam.currentChordIndex + 1,
    jam.currentChordIndex + 6,
  );

  const canPlay =
    jam.mode === 'infinite' ||
    (jam.mode === 'preset' && jam.selectedPreset !== null);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="jam-card">
      {/* 1. Mode toggle */}
      <ToggleButtonGroup label="Jam mode" layout="segmented">
        <Button
          variant="outline"
          size="sm"
          active={jam.mode === 'preset'}
          onClick={() => setJamMode('preset')}
        >
          Preset
        </Button>
        <Button
          variant="outline"
          size="sm"
          active={jam.mode === 'infinite'}
          onClick={() => setJamMode('infinite')}
        >
          Infinite
        </Button>
      </ToggleButtonGroup>

      {/* 2. Preset picker */}
      {jam.mode === 'preset' && (
        <Select
          size="sm"
          value={jam.selectedPreset ?? ''}
          onChange={(e) => setJamPreset(e.target.value || null)}
          options={[
            { value: '', label: '— choose progression —', disabled: true },
            ...presetOptions,
          ]}
        />
      )}

      {/* 3. Algorithm picker */}
      {jam.mode === 'infinite' && (
        <Select
          size="sm"
          value={jam.algorithm}
          onChange={(e) => setJamAlgorithm(e.target.value as JamAlgorithm)}
          groups={ALGORITHM_GROUPS}
        />
      )}

      {/* 4. Chord display */}
      <div className="jam-chord-display">
        <div className="jam-current-chord">
          {currentChord ? (
            <>
              <div className="jam-chord-note">
                {currentChord.note}{currentChord.symbol}
              </div>
              <div className="jam-chord-roman">{currentChord.roman}</div>
            </>
          ) : (
            <div className="jam-chord-note jam-chord-empty">—</div>
          )}
        </div>

        <div className="jam-upcoming">
          {upcomingChords.map((chord, i) => (
            <div
              key={`${jam.currentChordIndex}-${i}`}
              className="jam-upcoming-item"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <div className="jam-upcoming-note">
                {chord.note}{chord.symbol}
              </div>
              <div className="jam-upcoming-roman">{chord.roman}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Drum row */}
      <div className="jam-drum-row">
        <Checkbox
          checked={jam.drumsEnabled}
          onCheckedChange={setJamDrumsEnabled}
          label="Drums"
        />
        <Select
          size="sm"
          value={jam.drumPattern}
          onChange={(e) => setJamDrumPattern(e.target.value as DrumPatternName)}
          options={DRUM_PATTERN_OPTIONS}
          disabled={!jam.drumsEnabled}
        />
      </div>

      {/* 6. BPM control */}
      <div className="jam-bpm-row">
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(-5)} aria-label="-5 BPM">−5</Button>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(-1)} aria-label="-1 BPM">−1</Button>
        <div className="jam-bpm-display">
          <span className="jam-bpm-value">{jam.bpm}</span>
          <span className="jam-bpm-label">BPM</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(1)} aria-label="+1 BPM">+1</Button>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(5)} aria-label="+5 BPM">+5</Button>
      </div>

      {/* 7. Controls row */}
      <div className="jam-controls-row">
        <label className="ds-label-inline">Beats/chord</label>
        <Select
          size="sm"
          value={String(jam.beatsPerChord)}
          onChange={(e) => setJamBeatsPerChord(Number(e.target.value))}
          options={BEATS_PER_CHORD_OPTIONS}
        />
        <Checkbox
          checked={jam.syncMetronome}
          onCheckedChange={setJamSyncMetronome}
          label="Sync Metronome"
        />
      </div>

      {/* 8. Play/Stop button */}
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
