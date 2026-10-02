import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Jam.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Select } from '../../ui';
import type { JamAlgorithm } from '../../../data/jamAlgorithms';
import { PROGRESSIONS, diatonicChord, keyMode } from '../../../data/jamHarmony';
import type { scales } from '../../../data/musicData';
import { useJamProgression } from './useJamSound';

export const PATTERNS: Array<{ value: JamAlgorithm; label: string; group?: string }> = [
  { value: 'endless', label: 'Endless progressions' },
  { value: 'fifths', label: 'Circle of fifths', group: 'Key drills' },
  { value: 'fourths', label: 'Circle of fourths', group: 'Key drills' },
  { value: 'skip1', label: 'Whole steps', group: 'Key drills' },
  { value: 'skip2', label: 'Minor thirds', group: 'Key drills' },
  { value: 'diatonic-fifths', label: 'Diatonic fifths', group: 'Key drills' },
  { value: 'diatonic-fourths', label: 'Diatonic fourths', group: 'Key drills' },
  { value: 'diatonic-thirds', label: 'Diatonic thirds', group: 'Key drills' },
  { value: 'ii-v', label: 'ii–V pairs', group: 'Key drills' },
  { value: 'random', label: 'Random (in key)', group: 'Key drills' },
];

type Mode = 'preset' | 'infinite';

/** The key's numerals for a list of scale degrees: "I–vi–IV–V". */
export const useNumerals = () => {
  const key = useStore(useShallow(st => ({ root: st.note.selectedNote ?? 'C', scale: (st.note.selectedScale ?? 'Major (Ionian)') as keyof typeof scales })));
  return {
    ...key,
    roman: (d: number) => diatonicChord(key.root, key.scale, d).roman,
    name: (degrees: number[]) => degrees.map(d => diatonicChord(key.root, key.scale, d).roman).join('–'),
  };
};

/** Where the chords come from: endless progressions (or a key drill), or a
 *  chosen progression — from the library or your own. */
export const JamSource: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const j = useStore(useShallow(st => ({
    mode: st.jam.mode, preset: st.jam.selectedPreset, progression: st.jam.progression, algorithm: st.jam.algorithm,
    setMode: st.setJamMode, setAlgorithm: st.setJamAlgorithm,
  })));
  const { saved, choose } = useJamProgression();
  const n = useNumerals();
  const mode = keyMode(n.root, n.scale);
  const library = [...PROGRESSIONS].sort((a, b) => Number(b.mode === mode) - Number(a.mode === mode));
  const options = [
    { value: '', label: 'Choose a progression…' },
    ...(j.preset === 'custom' ? [{ value: 'custom', label: `Editing: ${n.name(j.progression) || '(empty)'}`, group: 'Yours' }] : []),
    ...saved.map(p => ({ value: p.id, label: n.name(p.degrees), group: 'Yours' })),
    ...library.map(p => ({ value: p.id, label: p.name, group: p.mode === 'major' ? 'Major keys' : 'Minor keys' })),
  ];
  const pick = (id: string) => {
    if (!id || id === 'custom') return;
    const p = saved.find(x => x.id === id) ?? PROGRESSIONS.find(x => x.id === id);
    if (p) choose(id, p.degrees);
  };
  return (
    <div className={[s.source, compact ? s.sourceCompact : ''].join(' ')}>
      <SegmentedControl<Mode> label="Source" size="sm" value={j.mode} onChange={j.setMode}
        options={[{ value: 'infinite', label: 'Endless' }, { value: 'preset', label: 'Progression' }]} />
      {j.mode === 'infinite' ? (
        <Select label="Pattern" size="sm" value={j.algorithm} onChange={v => j.setAlgorithm(v as JamAlgorithm)} options={PATTERNS} />
      ) : (
        <Select label="Progression" size="sm" value={j.preset ?? ''} onChange={pick} options={options} />
      )}
    </div>
  );
};
