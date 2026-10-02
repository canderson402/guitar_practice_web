import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import s from './Jam.module.css';
import { useStore } from '../../../store/useStore';
import { Button, ChipButton } from '../../ui';
import { useJamProgression } from './useJamSound';
import { useNumerals } from './JamSource';

/** Build a progression from the key's chords, in order — or start from a
 *  preset and change it. Save the ones you like. */
export const ProgressionMaker: React.FC = () => {
  const j = useStore(useShallow(st => ({ preset: st.jam.selectedPreset, degrees: st.jam.progression })));
  const { saved, choose, save, remove } = useJamProgression();
  const n = useNumerals();
  const edit = (degrees: number[]) => choose('custom', degrees);
  const mine = saved.find(p => p.id === j.preset);
  return (
    <div role="group" aria-label="Build a progression" className={s.maker}>
      <ol className={s.makerList} aria-label="Your progression">
        {j.degrees.length === 0 && <li className={s.makerEmpty}>Add chords below, in order.</li>}
        {j.degrees.map((d, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={i} className={s.makerChip}>
            <span>{n.roman(d)}</span>
            <button type="button" className={s.makerRemove} aria-label={`Remove chord ${i + 1} (${n.roman(d)})`}
              onClick={() => edit(j.degrees.filter((_, k) => k !== i))}><X size={12} aria-hidden="true" /></button>
          </li>
        ))}
      </ol>
      <div className={s.makerAdd}>
        {[0, 1, 2, 3, 4, 5, 6].map(d => (
          <ChipButton key={d} className={s.makerNumeral} aria-label={`Add ${n.roman(d)}`} onClick={() => edit([...j.degrees, d])}>
            {n.roman(d)}
          </ChipButton>
        ))}
      </div>
      <div className={s.makerActions}>
        <Button size="sm" variant="ghost" disabled={j.degrees.length === 0} onClick={() => edit([])}>Clear</Button>
        <Button size="sm" disabled={j.degrees.length === 0 || !!mine} onClick={() => save(j.degrees)}>Save progression</Button>
        {mine && (
          <Button size="sm" variant="ghost" aria-label={`Delete ${n.name(mine.degrees)}`}
            onClick={() => { remove(mine.id); choose('custom', mine.degrees); }}>Delete</Button>
        )}
      </div>
    </div>
  );
};
