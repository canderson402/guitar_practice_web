import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronDown } from 'lucide-react';
import s from './Chords.module.css';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getScaleChords, scales, chordTypes } from '../../../data/musicData';
import { CHORD_TYPES, degreeLabel } from '../../../data/chordBuilder';
import { scaleShortName } from '../../shell/KeyPicker';
import { HeroFace } from '../HeroFace';
import { SegmentedControl, ChipButton, ChipSub } from '../../ui';
import { useCardPref } from '../../state/useCardPref';
import { useChordBuilder } from './useChordBuilder';
import { CompactBuilder } from './ChordBuilder';
import { NotePicker } from '../keys/NotePicker';
import { useEscape } from '../../ui/useEscape';

/** A key chord's full quality name and formula ("minor", "1 ♭3 5"). */
const describe = (type: string): { name: string; formula: string } | null => {
  const intervals = chordTypes[type as keyof typeof chordTypes]?.intervals;
  if (!intervals) return null;
  const match = CHORD_TYPES.find(t => t.intervals.length === intervals.length && t.intervals.every((x, i) => x === intervals[i]));
  return { name: match?.name ?? type, formula: intervals.map(i => degreeLabel(i, intervals)).join(' ') };
};

/** The chord's intervals, on a small line above the card's controls. */
const Formula: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span data-testid="chord-formula" className={s.formula}>{children}</span>
);

/** The chords of the shared key and scale. Picking one selects it app-wide
 *  (the Fretboard highlights its tones); picking it again clears it. */
export const ChordsFace: React.FC = () => {
  const n = useStore(useShallow(st => ({
    root: st.note.selectedNote, scale: st.note.selectedScale, selected: st.note.selectedChord, setChord: st.setSelectedChord,
  })));
  const setOverlay = useV2Store(st => st.setOverlay);
  const valid = n.root && n.scale && scales[n.scale as keyof typeof scales] && n.scale !== 'Chromatic';
  const chords = valid ? getScaleChords(n.root!, n.scale as keyof typeof scales) : [];
  const active = n.selected;
  const keyChord = active && active.type !== 'custom' ? describe(active.type) : null;
  // In key: the seven chords of the key. Any chord: build any quality.
  const [tab, setTabPref] = useCardPref<'key' | 'any'>('chord', 'tab', 'key');
  const b = useChordBuilder();
  // Any chord shows the last built chord; back to In key clears it.
  const setTab = (t: 'key' | 'any') => {
    setTabPref(t);
    if (t === 'any') b.showCurrent();
    else if (b.showing) b.clear();
  };
  // The root picker opens over the card (like the Note Trainer's).
  const [rootOpen, setRootOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEscape(rootOpen, () => setRootOpen(false));
  useEffect(() => {
    if (!rootOpen) return;
    const onDown = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setRootOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [rootOpen]);
  const tabs = (
    <SegmentedControl<'key' | 'any'> label="Chord source" size="sm" value={tab} onChange={setTab}
      options={[{ value: 'key', label: 'In key' }, { value: 'any', label: 'Any chord' }]} />
  );

  if (tab === 'any') {
    return (
      <div ref={wrapRef} className={s.wrap}>
        <HeroFace
          dense
          top={tabs}
          hero={b.showing && active ? `${active.note}${active.symbol}` : '—'}
          caption={b.showing && active ? `${active.note} ${b.type.name}` : 'Pick a chord type'}
          controls={<>
            {b.showing && <Formula>{b.type.formula}</Formula>}
            <CompactBuilder b={b} rootOpen={rootOpen} onChangeRoot={() => setRootOpen(o => !o)} />
          </>}
        />
        {rootOpen && (
          <div className={s.pickerOverlay}>
            <span className={s.pickerTitle}>Root</span>
            <NotePicker label="Root" value={b.state.root} autoFocus onPick={r => { b.setRoot(r); setRootOpen(false); }} />
          </div>
        )}
      </div>
    );
  }
  return (
    <HeroFace
      dense
      top={
        <span className={s.topRow}>
          {tabs}
          <button type="button" className={s.keyBtn} onClick={() => setOverlay({ kind: 'cardSheet', cardId: 'chord' })}>
            {n.root ?? '—'} {scaleShortName(n.scale)} <ChevronDown size={12} aria-hidden="true" />
          </button>
        </span>
      }
      hero={active && active.type !== 'custom' ? `${active.note}${active.symbol}` : '—'}
      caption={keyChord ? `${active!.roman} · ${active!.note} ${keyChord.name}` : chords.length ? 'Pick a chord' : 'No chords for this scale'}
      controls={<>
        {keyChord && <Formula>{keyChord.formula}</Formula>}
        <div className={s.chips}>
          {chords.map(c => {
            const on = !!active && active.note === c.note && active.type === c.type;
            return (
              <ChipButton key={c.roman} aria-label={`${c.note}${c.symbol}, ${c.roman}`} aria-pressed={on} selected={on}
                className={s.chip}
                onClick={() => n.setChord(on ? null : { note: c.note, type: c.type, symbol: c.symbol, roman: c.roman })}>
                <b>{c.note}{c.symbol}</b><ChipSub>{c.roman}</ChipSub>
              </ChipButton>
            );
          })}
        </div>
      </>}
    />
  );
};
