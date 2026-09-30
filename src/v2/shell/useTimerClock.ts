import { useEffect } from 'react';
import { useStore } from '../../store/useStore';

/** The practice timer's clock, mounted once in the v2 shell so the timer runs
 *  whether or not a Timer card is on screen (one engine, cards are views).
 *  Elapsed time comes from a performance.now() anchor, so it can't drift and
 *  catches up after background-tab throttling. */
export const useTimerClock = (): void => {
  const running = useStore(s => s.timer.isRunning);
  const mode = useStore(s => s.timer.mode);
  const setElapsedSeconds = useStore(s => s.setElapsedSeconds);
  const setTimerRunning = useStore(s => s.setTimerRunning);

  useEffect(() => {
    if (!running) return;
    const anchorMs = performance.now();
    const anchorSeconds = useStore.getState().timer.elapsedSeconds;
    const countUp = mode === 'countUp';
    const id = setInterval(() => {
      const passed = Math.floor((performance.now() - anchorMs) / 1000);
      const next = countUp ? anchorSeconds + passed : Math.max(0, anchorSeconds - passed);
      if (next !== useStore.getState().timer.elapsedSeconds) setElapsedSeconds(next);
      if (!countUp && next === 0) setTimerRunning(false);
    }, 200);
    return () => clearInterval(id);
  }, [running, mode, setElapsedSeconds, setTimerRunning]);
};
