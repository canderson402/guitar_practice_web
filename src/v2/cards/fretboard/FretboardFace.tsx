import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import s from './FretboardCard.module.css';
import { useStore } from '../../../store/useStore';
import { Fretboard } from '../../../components/Fretboard';
import { PianoKeyboard } from '../../../components/PianoKeyboard';
import { getScaleNotes, getChromaticScale, scales } from '../../../data/musicData';
import { chordPitches, chordDegreeOf, chordNameOf, scaleNameOf } from './chordPitches';
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
  const noteSelected = useV2Store(st => st.noteSelected);
  const setNoteSelected = useV2Store(st => st.setNoteSelected);
  const p = useFretboardPrefs();

  const scaleNotes = useMemo(() => (n.root
    ? (n.scale && scales[n.scale as keyof typeof scales] ? getScaleNotes(n.root, n.scale as keyof typeof scales) : getChromaticScale(n.root))
    : []), [n.root, n.scale]);
  // The note the Scale card is on — highlighted separately; the root never changes.
  // An out-of-key note clicked on the neck overrides it until something moves on.
  const ctx = { root: n.root, scale: n.scale, index: n.index };
  const selected = !noteSelected ? null
    : activePick(picked, ctx) ?? (scaleNotes.length ? scaleNotes[Math.min(n.index, scaleNotes.length - 1)] : null);

  // Clicking a note (in the key or not) selects it and makes sure the
  // Selected note layer is showing; clicking the selected note again
  // deselects it (like a chord).
  const onCellClick = (_string: number, _fret: number, note: string) => {
    if (selected && chromaticPosition(selected) === chromaticPosition(note)) {
      setNoteSelected(false);
      setPicked(null);
      return;
    }
    const { index, pick } = pickFromFretboard(note, scaleNotes, ctx);
    if (index !== null) n.setIndex(index);
    // An out-of-key pick is tied to the scale position it was made at.
    setPicked(pick ? { ...pick, index: index ?? n.index } : null);
    setNoteSelected(true);
    if (!p.showSelected) p.setShowSelected(true);
  };
  const degrees = (n.scale && scaleDegreeLabels(n.scale)) || null;

  const dots = useMemo(() => buildDots({
    tuning: n.tuning, frets: p.frets, root: n.root, scaleNotes, selected,
    show: { root: p.showRoot, scale: p.showScale, selected: p.showSelected },
    labels: p.labels,
    // While a chord shows, intervals are measured from its root, not the key.
    degreeOf: n.chord ? chordDegreeOf(n.chord) : note => {
      const i = scaleNotes.findIndex(x => chromaticPosition(x) === chromaticPosition(note));
      return degrees && i >= 0 ? degrees[i] : intervalSymbol(n.root ?? 'C', note);
    },
    // Names spelled for the context: the chord's own spelling, else the key's.
    nameOf: n.chord ? chordNameOf(n.chord) : scaleNameOf(scaleNotes),
    chord: n.chord ? { root: n.chord.note, pitches: chordPitches(n.chord) } : null,
  }), [n.tuning, p.frets, n.root, scaleNotes, selected, p.showRoot, p.showScale, p.showSelected, p.labels, degrees, n.chord]);

  const props = { strings: n.tuning.length, fretCount: p.frets, tuning: n.tuning, dots, showStringLabels: true, showFretNumbers: 'bottom' as const, textMode: 'white' as const, onCellClick };

  return (
    <div className={s.face}>
      <div className={s.bar}>
        <SegmentedControl<View> label="View" size="sm" value={n.view} onChange={n.setView}
          options={[{ value: 'fretboard', label: 'Fretboard' }, { value: 'piano', label: 'Piano' }]} />
        {/* What's selected right now — each dismissible — kept apart from the layer toggles. */}
        <div role="group" aria-label="Selection" className={s.selection}>
          {selected && (
            <button type="button" className={[s.chip, s.noteChip].join(' ')} aria-label={`Deselect note ${selected}`}
              onClick={() => { setNoteSelected(false); setPicked(null); }}>
              Note: {selected} <X size={12} aria-hidden="true" />
            </button>
          )}
          {n.chord && (
            <button type="button" className={[s.chip, s.chordChip].join(' ')} aria-label={`Stop showing chord ${n.chord.note}${n.chord.symbol}`} onClick={() => n.setChord(null)}>
              Chord: {n.chord.note}{n.chord.symbol} <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={s.toggles}>
          <Toggle on={p.showRoot} color="var(--note-root)" onClick={() => p.setShowRoot(!p.showRoot)}>Root</Toggle>
          <Toggle on={p.showScale} color="var(--note-scale)" onClick={() => p.setShowScale(!p.showScale)}>Scale</Toggle>
          <Toggle on={p.showSelected} color="var(--note-chord)" onClick={() => p.setShowSelected(!p.showSelected)}>Selected note</Toggle>
          <Toggle on={p.labels === 'intervals'} onClick={() => p.setLabels(p.labels === 'intervals' ? 'notes' : 'intervals')}>Intervals</Toggle>
        </div>
      </div>
      <div className={s.neck}>{n.view === 'piano' ? <PianoKeyboard {...props} /> : <Fretboard {...props} />}</div>
    </div>
  );
};
