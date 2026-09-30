import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../../store/useStore';
import { useAudibleBeat } from '../../../audio';

const randomOther = (current: number, length: number): number => {
  if (length <= 1) return 0;
  let i = current;
  while (i === current) i = Math.floor(Math.random() * length);
  return i;
};

/** Scale auto-advance (same behavior as v1): keeps `nextNoteIndex` ready,
 *  changes note every N bars (counted from the transport) or N seconds (from
 *  the practice timer). */
export const useScaleAdvance = (noteCount: number): void => {
  const n = useStore(useShallow(st => ({
    index: st.note.currentNoteIndex, randomize: st.note.randomize,
    mode: st.note.changeMode, interval: st.note.changeInterval, nextIndex: st.note.nextNoteIndex,
    setIndex: st.setCurrentNoteIndex, setNextIndex: st.setNextNoteIndex,
  })));
  const timer = useStore(useShallow(st => ({ running: st.timer.isRunning, elapsed: st.timer.elapsedSeconds })));
  const lastChange = useRef(0);

  useEffect(() => {
    if (noteCount > 1) n.setNextIndex(n.randomize ? randomOther(n.index, noteCount) : (n.index + 1) % noteCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n.index, n.randomize, noteCount]);

  useAudibleBeat(ev => {
    const { note } = useStore.getState();
    if (note.changeMode !== 'bars' || noteCount <= 1) return;
    if (ev.beatInBar === 0 && ev.barIndex > 0 && ev.barIndex % note.changeInterval === 0) n.setIndex(note.nextNoteIndex);
  });

  useEffect(() => {
    if (!timer.running || timer.elapsed === 0) lastChange.current = 0;
  }, [timer.running, timer.elapsed]);

  useEffect(() => {
    if (n.mode !== 'time' || !timer.running || noteCount <= 1) return;
    if (timer.elapsed > 0 && timer.elapsed - lastChange.current >= n.interval) {
      n.setIndex(n.nextIndex);
      lastChange.current = timer.elapsed;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.running, timer.elapsed, n.mode, n.interval, n.nextIndex, noteCount]);
};
