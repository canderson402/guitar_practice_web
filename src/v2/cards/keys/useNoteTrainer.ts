import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../../store/useStore';
import { useAudibleBeat, useTransport } from '../../../audio';
import { nextKey, nextFromHat, shouldAdvance } from './keyCycle';
import type { Accidental } from './keyCycle';
import { useV2Store } from '../../state/useV2Store';
import { useShuffleBag } from './shuffleBag';
import { useCardPref } from '../../state/useCardPref';

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** Note Trainer engine (same behavior as v1): keeps the next key ready,
 *  advances on the shared metronome (bars/beats) or practice timer
 *  (seconds), and returns the countdown line to show. */
export const useNoteTrainer = (): string => {
  const st = useStore(useShallow(x => ({
    note: x.note.selectedNote ?? 'C', c: x.circleOfFifths, playing: x.metronome.isPlaying,
    timerRunning: x.timer.isRunning, elapsed: x.timer.elapsedSeconds,
    setNote: x.setSelectedNote, setNext: x.setCircleNextNote,
  })));
  const lastChange = useRef(0);

  const [hat] = useCardPref('note-trainer', 'shuffleAll', true);
  const [accidental] = useCardPref<Accidental>('note-trainer', 'accidentals', 'sharp');
  const shuffling = st.c.randomize && hat;
  useEffect(() => {
    // Shuffle: each key once per round, drawn out of a hat.
    if (shuffling) st.setNext(nextFromHat(st.note, useShuffleBag.getState().record(st.note), accidental));
    else st.setNext(nextKey(st.note, st.c.direction, st.c.randomize, accidental));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.note, st.c.direction, st.c.randomize, shuffling, accidental]);

  const advance = () => {
    const { note, circleOfFifths: c } = useStore.getState();
    const acc = (useV2Store.getState().cardPrefs['note-trainer']?.accidentals as Accidental | undefined) ?? 'sharp';
    const to = c.nextNote ?? nextKey(note.selectedNote ?? 'C', c.direction, c.randomize, acc);
    useStore.getState().setSelectedNote(to);
  };

  useAudibleBeat(ev => {
    const c = useStore.getState().circleOfFifths;
    if (c.autoAdvance && shouldAdvance(c.changeMode, ev, c.changeInterval, c.countIn)) advance();
  });

  useEffect(() => { if (!st.timerRunning || st.elapsed === 0) lastChange.current = 0; }, [st.timerRunning, st.elapsed]);
  useEffect(() => {
    if (!st.c.autoAdvance || st.c.changeMode !== 'time' || !st.timerRunning) return;
    if (st.elapsed > 0 && st.elapsed - lastChange.current >= st.c.changeInterval) {
      advance();
      lastChange.current = st.elapsed;
    }
  }, [st.c.autoAdvance, st.c.changeMode, st.c.changeInterval, st.timerRunning, st.elapsed]);

  const beatDriven = st.c.autoAdvance && st.playing && (st.c.changeMode === 'bars' || st.c.changeMode === 'beats');
  const pos = useTransport(useShallow(t => (beatDriven
    ? { beatCount: t.beatCount, barIndex: t.barIndex, beatInBar: t.beatInBar, beatsPerBar: t.beatsPerBar } : null)));

  const { c } = st;
  if (!c.autoAdvance) return 'Off';
  if (c.changeMode === 'time') {
    if (!st.timerRunning) return 'Starts with the timer';
    return `Next in ${plural(c.changeInterval - ((st.elapsed - lastChange.current) % c.changeInterval), 'sec')}`;
  }
  if (!pos) return 'Starts with the metronome';
  const heard = Math.max(pos.beatCount, 0);
  if (c.changeMode === 'beats') {
    if (heard < c.countIn) return `Count-in ${c.countIn - heard}`;
    return `Next in ${plural(c.changeInterval - ((heard - c.countIn) % c.changeInterval), 'beat')}`;
  }
  const barsLeft = c.changeInterval - (pos.beatCount < 0 ? 0 : pos.barIndex % c.changeInterval);
  return barsLeft === 1 && pos.beatCount >= 0 ? `Next in ${plural(pos.beatsPerBar - pos.beatInBar, 'beat')}` : `Next in ${plural(barsLeft, 'bar')}`;
};
