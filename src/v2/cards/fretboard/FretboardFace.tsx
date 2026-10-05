import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { buildDots, dotForNote } from './buildDots';
import type { DotStyle } from './buildDots';
import { useFretboardPrefs } from './useFretboardPrefs';
import { positionCount, shapesAvailable, positionRegionMap } from '../../../data/scalePositions';
import { ShapesBar, positionColor } from './ShapesBar';
import { useV2Store } from '../../state/useV2Store';
import { activePick, pickFromFretboard } from './pickNote';
import { cellToMidi, midiToPitch } from '../../../data/pitch';
import { playGuitarNote, preloadGuitar } from '../../../audio/guitar';
import { playPianoNote, preloadPiano } from '../../../audio/piano';

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
  // Shapes: only the neck the enabled positions cover gets dots (when the scale
  // and tuning allow) — a selected note or chord tone outside the key still shows there.
  const shapeCount = positionCount(n.scale);
  const shapeReason = shapeCount === 0 ? 'No shapes for this scale yet'
    : !shapesAvailable(n.tuning) ? 'Shapes need standard tuning (any pitch)' : null;
  const only = useMemo(() => {
    if (!p.shapes || shapeReason) return null;
    const region = positionRegionMap({ root: n.root, scale: n.scale, tuning: n.tuning, frets: p.frets, positions: p.positions });
    // Colors off: the same notes, drawn in the normal root / scale / selected colors.
    return new Map(Array.from(region, ([key, positions]) => [key, p.positionColors ? positions.map(positionColor) : []]));
  }, [p.shapes, shapeReason, n.root, n.scale, n.tuning, p.frets, p.positions, p.positionColors]);
  // The note the Scale card is on — highlighted separately; the root never changes.
  // An out-of-key note clicked on the neck overrides it until something moves on.
  const ctx = { root: n.root, scale: n.scale, index: n.index };
  const selected = !noteSelected ? null
    : activePick(picked, ctx) ?? (scaleNotes.length ? scaleNotes[Math.min(n.index, scaleNotes.length - 1)] : null);

  // Clicking a note (in the key or not) selects it and makes sure the
  // Selected note layer is showing; clicking the selected note again
  // deselects it (like a chord).
  // On the fretboard, a played note flashes (with its label) and a small
  // ripple spreads out from it — drawn over the neck so it can grow past the
  // cell. Piano keys play without it.
  const neckRef = useRef<HTMLDivElement>(null);
  type Ripple = { id: number; x: number; y: number; size: number; label: string };
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);
  // The fret or key being pressed (keyboard presses use the focused one).
  const pressed = useRef<Element | null>(null);
  const onNeckPointerDown = (e: React.PointerEvent) => {
    pressed.current = (e.target as Element).closest('button, [role="button"]');
  };
  const ripple = (label: string) => {
    const neck = neckRef.current;
    const onNote = pressed.current ?? document.activeElement;
    pressed.current = null;
    if (!neck || !onNote || !neck.contains(onNote)) return;
    const r = neck.getBoundingClientRect();
    // Centre on the note's dot itself, at its real size, so the flash covers it exactly.
    const dot = onNote.querySelector('[data-testid="fret-dot"]') ?? onNote;
    const box = dot.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const id = ++rippleId.current;
    setRipples(list => [...list, {
      id, x: cx - r.left - neck.clientLeft + neck.scrollLeft, y: cy - r.top - neck.clientTop + neck.scrollTop,
      size: Math.max(box.width, box.height) || 26, label,
    }]);
  };

  // Play notes: load both sounds ahead of the first click (until they're
  // ready, a click plays a simple synth tone).
  useEffect(() => {
    if (!p.playNotes) return;
    void preloadGuitar().catch(() => {});
    void preloadPiano().catch(() => {});
  }, [p.playNotes]);

  const onNoteClick = (note: string, midi: number, instrument: 'guitar' | 'piano') => {
    if (p.playNotes) {
      if (instrument === 'guitar') ripple(labelOf(note));
      void (instrument === 'piano' ? playPianoNote(midi) : playGuitarNote(midi)).catch(() => {});
      // With the Selected note layer off, a click just plays the note —
      // nothing is selected and the layer stays off.
      if (!p.showSelected) return;
    }
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

  const onCellClick = (string: number, fret: number, note: string) => onNoteClick(note, cellToMidi(n.tuning, string, fret), 'guitar');

  // How notes are drawn — shared by the fretboard and the (tuning-free) piano.
  const style = useMemo((): DotStyle => ({
    root: n.root, scaleNotes, selected,
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
  }), [n.root, scaleNotes, selected, p.showRoot, p.showScale, p.showSelected, p.labels, degrees, n.chord]);
  const dots = useMemo(() => buildDots({ ...style, tuning: n.tuning, frets: p.frets, only }), [style, n.tuning, p.frets, only]);

  // A note's label as the dots show it (empty frets preview it on hover; the
  // played-note flash shows it too).
  const labelOf = (note: string) => (p.labels === 'intervals' ? style.degreeOf(note) : (style.nameOf?.(note) ?? note));
  const props = {
    strings: n.tuning.length, fretCount: p.frets, tuning: n.tuning, dots, showStringLabels: true,
    showFretNumbers: 'bottom' as const, textMode: 'white' as const, onCellClick, clickableEmpty: true, fullSizePreview: true, labelOf,
  };
  const keyboard = (
    <PianoKeyboard textMode="white" dotFor={midi => dotForNote(style, midiToPitch(midi).name)}
      onKeyClick={(midi, note) => onNoteClick(note, midi, 'piano')} />
  );

  return (
    <div className={s.face}>
      <div className={s.bar}>
        <SegmentedControl<View> label="View" size="sm" value={n.view} onChange={n.setView}
          options={[{ value: 'fretboard', label: 'Fretboard' }, { value: 'piano', label: 'Piano' }]} />
        {n.view === 'fretboard' && (
          <ShapesBar count={shapeCount} reason={shapeReason} on={p.shapes} setOn={p.setShapes}
            positions={p.positions} setPositions={p.setPositions} colors={p.positionColors} setColors={p.setPositionColors} />
        )}
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
          <Toggle on={p.playNotes} onClick={() => p.setPlayNotes(!p.playNotes)}>Play notes</Toggle>
        </div>
      </div>
      <div ref={neckRef} className={s.neck} onPointerDownCapture={onNeckPointerDown}>
        {n.view === 'piano' ? keyboard : <Fretboard {...props} />}
        {ripples.map(r => (
          <React.Fragment key={r.id}>
            <span data-testid="note-flash" aria-hidden="true" className={[s.flash, s.flashDot].join(' ')}
              style={{ left: `${r.x}px`, top: `${r.y}px`, width: `${r.size}px`, height: `${r.size}px`, margin: `${-r.size / 2}px 0 0 ${-r.size / 2}px` }}>
              <span className={s.flashLabel}>{r.label}</span>
            </span>
            <span data-testid="note-ripple" aria-hidden="true" className={s.ripple}
              style={{ left: `${r.x}px`, top: `${r.y}px`, width: `${r.size}px`, height: `${r.size}px`, margin: `${-r.size / 2}px 0 0 ${-r.size / 2}px` }}
              onAnimationEnd={() => setRipples(list => list.filter(x => x.id !== r.id))} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
