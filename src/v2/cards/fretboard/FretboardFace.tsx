import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './FretboardCard.module.css';
import { useStore } from '../../../store/useStore';
import { Fretboard } from '../../../components/Fretboard';
import { PianoKeyboard } from '../../../components/PianoKeyboard';
import { getScaleNotes, getChromaticScale, scales, chordTypes, getChordChromaticPositions } from '../../../data/musicData';
import { SegmentedControl } from '../../ui';
import { intervalSymbol, scaleDegreeLabels, chromaticPosition } from '../../music/intervals';
import { buildDots } from './buildDots';
import { useFretboardPrefs } from './useFretboardPrefs';
import { useV2Store } from '../../state/useV2Store';
import { activePick, pickFromFretboard } from './pickNote';

type View = 'fretboard' | 'piano';

const Toggle: React.FC<{ on: boolean; color?: string; onClick(): void; children: React.ReactNode }> = ({ on, color, onClick, children }) => (
  <button type="button" aria-pressed={on} className={[s.toggle, on ? '' : s.off].join(' ')} onClick={onClick}>
    {color && <i className={s.swatch} style={{ background: color }} />}{children}
  </button>
);

export const FretboardFace: React.FC = () => {
  const n = useStore(useShallow(st => ({
    root: st.note.selectedNote, scale: st.note.selectedScale, index: st.note.currentNoteIndex,
    tuning: st.note.tuning, chord: st.note.selectedChord, view: st.viewMode as View, setView: st.setViewMode,
    setIndex: st.setCurrentNoteIndex, setChord: st.setSelectedChord,
  })));
  const picked = useV2Store(st => st.pickedNote);
  const setPicked = useV2Store(st => st.setPickedNote);
  const p = useFretboardPrefs();

  const scaleNotes = useMemo(() => (n.root
    ? (n.scale && scales[n.scale as keyof typeof scales] ? getScaleNotes(n.root, n.scale as keyof typeof scales) : getChromaticScale(n.root))
    : []), [n.root, n.scale]);
  // The note the Scale card is on — highlighted separately; the root never changes.
  // An out-of-key note clicked on the neck overrides it until something moves on.
  const ctx = { root: n.root, scale: n.scale, index: n.index };
  const selected = activePick(picked, ctx) ?? (scaleNotes.length ? scaleNotes[Math.min(n.index, scaleNotes.length - 1)] : null);

  // Clicking any note (in the key or not) makes it the selected note, and
  // makes sure the Selected note layer is showing.
  const onCellClick = (_string: number, _fret: number, note: string) => {
    const { index, pick } = pickFromFretboard(note, scaleNotes, ctx);
    if (index !== null) n.setIndex(index);
    setPicked(pick);
    if (!p.showSelected) p.setShowSelected(true);
    if (n.chord) n.setChord(null);
  };
  const degrees = (n.scale && scaleDegreeLabels(n.scale)) || null;

  const dots = useMemo(() => buildDots({
    tuning: n.tuning, frets: p.frets, root: n.root, scaleNotes, selected,
    show: { root: p.showRoot, scale: p.showScale, selected: p.showSelected && !n.chord },
    labels: p.labels,
    degreeOf: note => {
      const i = scaleNotes.findIndex(x => chromaticPosition(x) === chromaticPosition(note));
      return degrees && i >= 0 ? degrees[i] : intervalSymbol(n.root ?? 'C', note);
    },
    chord: n.chord ? { root: n.chord.note, pitches: getChordChromaticPositions(n.chord.note, n.chord.type as keyof typeof chordTypes) } : null,
  }), [n.tuning, p.frets, n.root, scaleNotes, selected, p.showRoot, p.showScale, p.showSelected, p.labels, degrees, n.chord]);

  const props = { strings: n.tuning.length, fretCount: p.frets, tuning: n.tuning, dots, showStringLabels: true, showFretNumbers: 'bottom' as const, textMode: 'white' as const, onCellClick };

  return (
    <div className={s.face}>
      <div className={s.bar}>
        <SegmentedControl<View> label="View" size="sm" value={n.view} onChange={n.setView}
          options={[{ value: 'fretboard', label: 'Fretboard' }, { value: 'piano', label: 'Piano' }]} />
        <div className={s.toggles}>
          <Toggle on={p.showRoot} color="var(--note-root)" onClick={() => p.setShowRoot(!p.showRoot)}>Root</Toggle>
          <Toggle on={p.showScale} color="var(--note-scale)" onClick={() => p.setShowScale(!p.showScale)}>Scale</Toggle>
          {!n.chord && <Toggle on={p.showSelected} color="var(--note-chord)" onClick={() => p.setShowSelected(!p.showSelected)}>Selected note</Toggle>}
          <Toggle on={p.labels === 'intervals'} onClick={() => p.setLabels(p.labels === 'intervals' ? 'notes' : 'intervals')}>Intervals</Toggle>
        </div>
      </div>
      <div className={s.neck}>{n.view === 'piano' ? <PianoKeyboard {...props} /> : <Fretboard {...props} />}</div>
    </div>
  );
};
