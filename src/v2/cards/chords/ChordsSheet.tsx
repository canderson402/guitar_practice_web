import React from 'react';
import s from './Chords.module.css';
import { useStore } from '../../../store/useStore';
import { Button, Chip } from '../../ui';
import { KeyPicker } from '../../shell/KeyPicker';
import { FullBuilder } from './ChordBuilder';
import { useChordBuilder } from './useChordBuilder';

export const ChordsSheet: React.FC = () => {
  const selected = useStore(st => st.note.selectedChord);
  const setChord = useStore(st => st.setSelectedChord);
  const b = useChordBuilder();
  return (
    <>
      <div className={s.field}><span className={s.label}>Key &amp; scale</span><KeyPicker /></div>
      <div className={s.field}><span className={s.label}>Any chord</span><FullBuilder b={b} /></div>
      <div className={s.field}><span className={s.label}>Selected chord</span>
        <div className={s.selectedRow}>
          <Chip>{selected ? `${selected.note}${selected.symbol}${selected.roman ? ` · ${selected.roman}` : ''}` : 'None'}</Chip>
          <Button size="sm" aria-label="Clear chord" disabled={!selected} onClick={() => setChord(null)}>Clear</Button>
        </div>
      </div>
      <p className={s.hint}>The selected chord is highlighted on the Fretboard.</p>
    </>
  );
};
