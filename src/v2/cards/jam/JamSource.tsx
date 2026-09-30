import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Jam.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Select } from '../../ui';
import { majorProgressions, minorProgressions } from '../../../data/musicData';
import type { JamAlgorithm } from '../../../data/jamAlgorithms';

const MINOR_SCALES = new Set(['Aeolian (Natural Minor)', 'Dorian', 'Phrygian', 'Locrian', 'Harmonic Minor', 'Minor Pentatonic']);

export const PATTERNS: Array<{ value: JamAlgorithm; label: string }> = [
  { value: 'fifths', label: 'Fifths' },
  { value: 'fourths', label: 'Fourths' },
  { value: 'skip1', label: 'Whole steps' },
  { value: 'skip2', label: 'Minor thirds' },
  { value: 'diatonic-fifths', label: 'Diatonic fifths' },
  { value: 'diatonic-fourths', label: 'Diatonic fourths' },
  { value: 'diatonic-thirds', label: 'Diatonic thirds' },
  { value: 'ii-v', label: 'ii–V pairs' },
  { value: 'random', label: 'Random (in key)' },
];

type Mode = 'preset' | 'infinite';

/** Where the chords come from: an endless pattern, or a preset progression
 *  in the shared key (major or minor presets to match the scale). */
export const JamSource: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const j = useStore(useShallow(st => ({
    mode: st.jam.mode, preset: st.jam.selectedPreset, algorithm: st.jam.algorithm, scale: st.note.selectedScale,
    setMode: st.setJamMode, setPreset: st.setJamPreset, setAlgorithm: st.setJamAlgorithm,
  })));
  const presets = Object.keys(MINOR_SCALES.has(j.scale ?? '') ? minorProgressions : majorProgressions);
  return (
    <div className={[s.source, compact ? s.sourceCompact : ''].join(' ')}>
      <SegmentedControl<Mode> label="Source" size="sm" value={j.mode} onChange={j.setMode}
        options={[{ value: 'infinite', label: 'Infinite' }, { value: 'preset', label: 'Preset' }]} />
      {j.mode === 'infinite' ? (
        <Select label="Pattern" size="sm" value={j.algorithm} onChange={v => j.setAlgorithm(v as JamAlgorithm)} options={PATTERNS} />
      ) : (
        <Select label="Progression" size="sm" value={j.preset ?? ''} onChange={v => j.setPreset(v || null)}
          options={[{ value: '', label: 'Choose a progression…' }, ...presets.map(p => ({ value: p, label: p }))]} />
      )}
    </div>
  );
};
