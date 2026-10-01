import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './NoteTrainer.module.css';
import { useStore } from '../../../store/useStore';
import { Switch, SegmentedControl } from '../../ui';
import { HeroFace } from '../HeroFace';
import { useEscape } from '../../ui/useEscape';
import { NotePicker } from './NotePicker';
import { nextKey } from './keyCycle';
import { useNoteTrainer } from './useNoteTrainer';
import { PresetChips, usePresets } from './PresetChips';
import { samePreset, Preset } from './presets';
import { useShuffleBag } from './shuffleBag';
import { useCardPref } from '../../state/useCardPref';

export type Order = 'clockwise' | 'counterclockwise' | 'random';
export const ORDER_OPTIONS: Array<{ value: Order; label: string }> = [
  { value: 'clockwise', label: 'Fifths →' }, { value: 'counterclockwise', label: '← Fourths' }, { value: 'random', label: 'Random' },
];
const UNIT: Record<string, string> = { bars: 'bar', beats: 'beat', time: 'sec', none: 'beat' };

/** Note Trainer: cycles the current note through all 12 keys — around the
 *  circle of fifths or fourths, or randomly — so you practice everything in
 *  every key. */
export const KeysFace: React.FC = () => {
  const st = useStore(useShallow(x => ({
    note: x.note.selectedNote ?? 'C', c: x.circleOfFifths,
    setAuto: x.setCircleAutoAdvance, setDirection: x.setCircleDirection, setRandom: x.setCircleRandomize,
    setNote: x.setSelectedNote, setMode: x.setCircleChangeMode, setInterval: x.setCircleChangeInterval,
  })));
  // Tap the note to choose another, right on the card.
  const [picking, setPicking] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEscape(picking, () => setPicking(false));
  useEffect(() => {
    if (!picking) return;
    const onDown = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setPicking(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [picking]);
  const countdown = useNoteTrainer();
  const next = st.c.nextNote ?? nextKey(st.note, st.c.direction, false);
  const order: Order = st.c.randomize ? 'random' : st.c.direction;
  const setOrder = (o: Order) => {
    if (o === 'random') st.setRandom(true);
    else { st.setRandom(false); st.setDirection(o); }
  };
  const every = `${st.c.changeInterval} ${UNIT[st.c.changeMode]}${st.c.changeInterval === 1 ? '' : 's'}`;
  const { presets } = usePresets();
  const [hat] = useCardPref('note-trainer', 'shuffleAll', true);
  const played = useShuffleBag(b => b.played.length);
  const onPreset = presets.some(p => samePreset(p, { mode: st.c.changeMode as Preset['mode'], interval: st.c.changeInterval }));
  return (
    <div ref={wrapRef} className={s.wrap}>
      <HeroFace
        top={<span className={s.auto}><Switch label="Auto-change" checked={st.c.autoAdvance} onChange={st.setAuto} />Auto-change</span>}
        hero={<><button type="button" className={s.noteBtn} aria-label={`Change note (${st.note})`} aria-expanded={picking}
          onClick={() => setPicking(p => !p)}>{st.note}</button>{st.c.showNext && <><span className={s.arrow}>→</span><span className={s.next}>{next}</span></>}</>}
        caption={countdown}
        controls={<>
          <SegmentedControl<Order> label="Order" size="sm" value={order} onChange={setOrder} options={ORDER_OPTIONS} />
          <PresetChips value={{ mode: st.c.changeMode as Preset['mode'], interval: st.c.changeInterval }}
            onChange={p => { st.setMode(p.mode); st.setInterval(p.interval); }} />
          {/* A setting that isn't a preset has no chip to show it. */}
          <span className={s.summary}>
            {!onPreset && <span>Every {every}</span>}
            {st.c.randomize && hat && <span>{played} of 12 played</span>}
          </span>
        </>}
      />
      {picking && (
        <div className={s.pickerOverlay}>
          <span className={s.pickerTitle}>Note</span>
          <NotePicker label="Note" value={st.note} autoFocus onPick={n => { st.setNote(n); setPicking(false); }} />
        </div>
      )}
    </div>
  );
};
