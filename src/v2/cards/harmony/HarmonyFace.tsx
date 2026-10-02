import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import s from './Harmony.module.css';
import { useStore } from '../../../store/useStore';
import { Fretboard } from '../../../components/Fretboard';
import { generateFretboard } from '../../../data/guitarData';
import { getScaleNotes, scales } from '../../../data/musicData';
import { useEscape } from '../../ui/useEscape';
import { Button } from '../../ui';
import { cellToMidi } from '../../../data/pitch';
import { preloadGuitar } from '../../../audio/guitar';
import { playSteps } from './playback';
import { resolvePairs, buildHarmonyDots, clickAction, sameNotePositions, nearest, harmonyOrder } from './harmonyModel';
import { useHarmonyPrefs } from './useHarmony';
import { HarmonyBar } from './HarmonyBar';
import { NoteRow } from './OrderStrip';

/** Place notes on one fretboard; each gets a harmony in the shared key. Dots
 *  are numbered in play order (a harmony shares its note's number). */
export const HarmonyFace: React.FC = () => {
  const st = useStore(useShallow(x => ({
    root: x.note.selectedNote, scale: x.note.selectedScale, tuning: x.note.tuning, notes: x.harmonyMaker.notes,
    add: x.addBaseNote, setHarmonyAt: x.setHarmonyPosition, move: x.moveBaseNote, swap: x.swapNotes, swapHarmony: x.swapHarmonyOrder,
    bpm: x.metronome.bpm,
  })));
  const prefs = useHarmonyPrefs();
  // The pair whose harmony spot is being chosen (its other spots are shown).
  const [choosing, setChoosing] = useState<string | null>(null);
  useEscape(choosing !== null, () => setChoosing(null));
  // A dot being dragged: one of your notes, or a harmony (as in the old card).
  const [drag, setDrag] = useState<{ kind: 'base' | 'harmony'; pair: string } | null>(null);

  const board = useMemo(() => generateFretboard(st.tuning, prefs.frets), [st.tuning, prefs.frets]);
  const pairs = useMemo(() => resolvePairs(st.notes, st.root, st.scale, board, prefs.frets, st.tuning), [st.notes, st.root, st.scale, board, prefs.frets, st.tuning]);
  const dragPair = drag ? pairs.find(p => p.key === drag.pair) ?? null : null;
  // Dragging a harmony shows its spots just like choosing one by clicking.
  const harmonies = harmonyOrder(pairs);
  // A harmony's spot sticks once placed: save any freshly chosen spot, so
  // later edits to other notes can't move it.
  useEffect(() => {
    pairs.forEach(p => { if (p.selected && !p.pinned) st.setHarmonyAt(p.note.stringIndex, p.note.fret, p.selected); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs]);
  const active = drag?.kind === 'harmony' && dragPair ? dragPair.key : pairs.some(p => p.key === choosing) ? choosing : null;
  const baseMoves = useMemo(() => (drag?.kind === 'base' && dragPair
    ? sameNotePositions(board, dragPair.note.stringIndex, dragPair.note.fret, prefs.frets) : null), [drag, dragPair, board, prefs.frets]);
  const keyNotes = useMemo(() => {
    if (!prefs.showKey || !st.root || !st.scale || !scales[st.scale as keyof typeof scales]) return null;
    return { root: st.root, scaleNotes: getScaleNotes(st.root, st.scale as keyof typeof scales), board, fretCount: prefs.frets };
  }, [prefs.showKey, st.root, st.scale, board, prefs.frets]);
  const dots = useMemo(() => buildHarmonyDots({
    pairs, labels: prefs.labels, choosing: active, keyNotes,
    movingBase: dragPair && baseMoves ? { pair: dragPair.key, positions: baseMoves } : null,
  }), [pairs, prefs.labels, active, keyNotes, dragPair, baseMoves]);

  const onCellClick = (si: number, fret: number) => {
    const a = clickAction(pairs, active, si, fret);
    if (a.kind === 'toggleBase') st.add({ stringIndex: si, fret });
    else if (a.kind === 'choose') setChoosing(a.pair);
    else if (a.kind === 'pick') {
      const p = pairs.find(x => x.key === a.pair)!;
      st.setHarmonyAt(p.note.stringIndex, p.note.fret, p.voicings[a.index]);
      setChoosing(null);
    } else setChoosing(null);
  };
  const onDragStart = (si: number, fret: number) => {
    setChoosing(null);
    const base = pairs.find(p => p.note.stringIndex === si && p.note.fret === fret);
    if (base) { setDrag({ kind: 'base', pair: base.key }); return; }
    const owner = pairs.find(p => p.selected && p.selected.stringIndex === si && p.selected.fret === fret);
    if (owner) setDrag({ kind: 'harmony', pair: owner.key });
  };
  // Drops snap to the nearest option (the current spot included, so dropping
  // near where it started leaves it there).
  const onDrop = (si: number, fret: number) => {
    if (drag && dragPair) {
      const onto = pairs.findIndex(p => p.note.stringIndex === si && p.note.fret === fret);
      if (drag.kind === 'harmony') st.setHarmonyAt(dragPair.note.stringIndex, dragPair.note.fret, dragPair.voicings[nearest(dragPair.voicings, si, fret)]);
      // Dropped on another of your notes: the two trade places in the order.
      else if (onto >= 0 && pairs[onto] !== dragPair) st.swap(pairs.indexOf(dragPair), onto);
      else if (baseMoves) {
        const options = [dragPair.note, ...baseMoves];
        const i = nearest(options, si, fret);
        if (i > 0) st.move(dragPair.note, options[i]);
      }
    }
    setDrag(null);
  };
  // Playback: each pair (your note + its harmony) as a quarter note at the tempo.
  const [step, setStep] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => { void preloadGuitar(); return () => stopRef.current?.(); }, []);
  const togglePlay = () => {
    if (stopRef.current) { stopRef.current(); return; }
    // Step i: melody note i with harmony i (each in its own order).
    const steps = pairs.map((p, i) => {
      const h = harmonies[i]?.selected;
      return [cellToMidi(st.tuning, p.note.stringIndex, p.note.fret), ...(h ? [cellToMidi(st.tuning, h.stringIndex, h.fret)] : [])];
    });
    setPlaying(true);
    stopRef.current = playSteps(steps, st.bpm, setStep, () => { stopRef.current = null; setPlaying(false); setStep(null); });
  };
  const playButton = (
    <Button size="sm" variant={playing ? 'secondary' : 'primary'} disabled={!playing && pairs.length === 0}
      aria-label={playing ? 'Stop harmony' : 'Play harmony'} onClick={togglePlay}>
      {playing ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}{playing ? 'Stop' : 'Play'}
    </Button>
  );
  const choosingOrder = pairs.findIndex(p => p.key === active) + 1;
  const dragOrder = dragPair ? pairs.indexOf(dragPair) + 1 : 0;

  return (
    <div className={s.face}>
      <HarmonyBar play={playButton} />
      <div className={s.neck}>
        <Fretboard strings={st.tuning.length} fretCount={prefs.frets} tuning={st.tuning} dots={dots}
          showStringLabels showFretNumbers="bottom" textMode="white" clickableEmpty onCellClick={onCellClick}
          cellsAcceptDrops={drag !== null} onDragStart={onDragStart} onDragEnd={() => setDrag(null)} onDrop={onDrop} />
      </div>
      <div className={s.legend} aria-live="polite" data-testid="harmony-legend">
        {drag?.kind === 'base' ? (
          <span className={s.choosing}>Drop note {dragOrder} on the same note elsewhere (dashed) to move it, or on another note to swap order</span>
        ) : drag?.kind === 'harmony' ? (
          <span className={s.choosing}>Drop harmony {dragOrder} on one of its spots (dashed)</span>
        ) : active ? (
          <span className={s.choosing}>Pick a spot for harmony {choosingOrder} (dashed) — or click anywhere else to cancel</span>
        ) : (
          <>
            <span><i className={[s.swatch, s.swBase].join(' ')} />Melody</span>
            <span><i className={[s.swatch, s.swHarm].join(' ')} />Harmony</span>
          </>
        )}
      </div>
      {pairs.length === 0 ? <p className={s.empty}>Click any fret to add a note.</p> : (
        <div className={s.rows}>
          <NoteRow label="Melody" current={step} empty=""
            items={pairs.map(p => ({ id: p.key, note: p.baseName }))} onSwap={st.swap} />
          <NoteRow label="Harmony" current={step} empty="Press Apply to add harmonies."
            items={harmonies.map(p => ({ id: `h:${p.key}`, note: p.selected!.note }))} onSwap={st.swapHarmony} />
        </div>
      )}
    </div>
  );
};
