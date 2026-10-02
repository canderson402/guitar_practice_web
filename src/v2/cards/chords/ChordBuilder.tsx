import React from 'react';
import s from './Chords.module.css';
import { ChevronDown } from 'lucide-react';
import { SegmentedControl, ChipButton } from '../../ui';
import { useCardPref } from '../../state/useCardPref';
import { CHORD_TYPES } from '../../../data/chordBuilder';
import { NotePicker } from '../keys/NotePicker';
import { useChordBuilder } from './useChordBuilder';

type Builder = ReturnType<typeof useChordBuilder>;
const GROUPS = Array.from(new Set(CHORD_TYPES.map(t => t.group)));

// Short names for the families on the small card.
const FAMILIES = [
  { value: 'Triads', label: 'Triads' }, { value: 'Sixths', label: '6ths' }, { value: 'Sevenths', label: '7ths' },
  { value: 'Extended', label: 'Ext' }, { value: 'Altered', label: 'Alt' },
];

const TypeChip: React.FC<{ b: Builder; t: (typeof CHORD_TYPES)[number] }> = ({ b, t }) => {
  const on = b.showing && b.state.typeId === t.id;
  return (
    <ChipButton aria-pressed={on} selected={on} aria-label={`${t.symbol || 'maj'}, ${t.name}`}
      onClick={() => b.setType(t.id, true)}>{t.symbol || 'maj'}</ChipButton>
  );
};

/** Card face: the root (tap to change), a family switch, and that family's
 *  types as chips. */
export const CompactBuilder: React.FC<{ b: Builder; onChangeRoot(): void; rootOpen: boolean }> = ({ b, onChangeRoot, rootOpen }) => {
  const [family, setFamily] = useCardPref<string>('chord', 'family', b.type.group);
  return (
    <div className={s.compact}>
      <div className={s.anyRow}>
        <button type="button" className={s.rootBtn} aria-label={`Change root (${b.state.root})`} aria-expanded={rootOpen} onClick={onChangeRoot}>
          {b.state.root} <ChevronDown size={12} aria-hidden="true" />
        </button>
        <SegmentedControl label="Chord family" size="sm" value={family} onChange={setFamily} options={FAMILIES} />
      </div>
      <div className={s.opts}>
        {CHORD_TYPES.filter(t => t.group === family).map(t => <TypeChip key={t.id} b={b} t={t} />)}
      </div>
    </div>
  );
};

/** Sheet: the root grid and every chord type as a chip, by family. */
export const FullBuilder: React.FC<{ b: Builder }> = ({ b }) => (
  <div role="group" aria-label="Any chord" className={s.full}>
    <span className={s.label}>Root</span>
    <NotePicker label="Root" value={b.state.root} onPick={b.setRoot} />
    {GROUPS.map(g => (
      <React.Fragment key={g}>
        <span className={s.label}>{g}</span>
        <div className={s.opts}>
          {CHORD_TYPES.filter(t => t.group === g).map(t => <TypeChip key={t.id} b={b} t={t} />)}
        </div>
      </React.Fragment>
    ))}
  </div>
);
