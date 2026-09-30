import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Minus, Plus } from 'lucide-react';
import s from './TuningEditor.module.css';
import { Picker, IconButton, Button } from '../ui';
import { useStore } from '../../store/useStore';
import { TUNING_PRESETS } from './tunings';
import { stepNote, shiftAll, matchPreset } from './tuning';

/** Edits the shared tuning (`note.tuning`): per-string semitone nudges,
 *  shift-all, and presets as shortcuts. Used by App settings and the
 *  Fretboard card's sheet — both are views onto the same state. */
export const TuningEditor: React.FC = () => {
  const { tuning, setTuning } = useStore(useShallow(st => ({ tuning: st.note.tuning, setTuning: st.setTuning })));
  const current = matchPreset(tuning)?.name ?? 'Custom';
  const setString = (idx: number, delta: 1 | -1) => {
    const next = [...tuning];
    next[idx] = stepNote(next[idx], delta);
    setTuning(next);
  };
  // Stored high → low (string 1 first); shown low → high like a guitar's strings.
  const strings = tuning.map((n, idx) => ({ n, idx, num: idx + 1 })).reverse();
  return (
    <div className={s.editor}>
      <span className={s.label}>Tuning · {current}</span>
      <div className={s.strings}>
        {strings.map(({ n, idx, num }) => (
          <div key={idx} className={s.string}>
            <IconButton size="sm" label={`Raise string ${num} (${n})`} icon={<Plus size={12} />} onClick={() => setString(idx, 1)} />
            <span className={s.note}>{n}</span>
            <IconButton size="sm" label={`Lower string ${num} (${n})`} icon={<Minus size={12} />} onClick={() => setString(idx, -1)} />
            <span className={s.num}>{num}</span>
          </div>
        ))}
      </div>
      <div className={s.shift}>
        <Button size="sm" aria-label="Lower all strings" onClick={() => setTuning(shiftAll(tuning, -1))}><Minus size={12} />All</Button>
        <Button size="sm" aria-label="Raise all strings" onClick={() => setTuning(shiftAll(tuning, 1))}><Plus size={12} />All</Button>
      </div>
      <Picker label="Tuning presets" value={current} columns={2}
        onChange={name => { const p = TUNING_PRESETS.find(t => t.name === name); if (p) setTuning(p.tuning); }}
        options={TUNING_PRESETS.map(p => ({ value: p.name, label: p.name }))} />
    </div>
  );
};
