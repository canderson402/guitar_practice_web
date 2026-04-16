import { getAudioContext } from './engine';
import { BeatCallback, Scheduler } from './types';

// ---------------------------------------------------------------------------
// Tempo-accurate beat scheduler (Chris Wilson's lookahead pattern).
//
// Why not setTimeout on every beat? JS timers are wall-clock, jittery, and
// pause when the tab is backgrounded. Audio needs sample-accurate timing.
//
// Pattern: a low-frequency setInterval (25 ms) peeks ahead 100 ms in
// audio-context time and, for every scheduled beat that falls in that
// window, calls the user's callback with the precise AudioContext time the
// beat should hit. The callback passes that time straight to
// `oscillator.start(time)` etc., which the audio thread executes on the dot.
// ---------------------------------------------------------------------------

const SCAN_INTERVAL_MS = 25;
const LOOKAHEAD_SEC = 0.1;

/**
 * Create a scheduler that fires `onBeat` at every quarter-note at the given
 * BPM. Start with `.start()`, stop with `.stop()`. BPM can be retuned at any
 * time; existing scheduled beats keep their time, future ones use the new
 * tempo.
 */
export const createScheduler = (
  initialBpm: number,
  onBeat: BeatCallback
): Scheduler => {
  let bpm = initialBpm;
  let running = false;
  let nextBeatTime = 0;       // AudioContext time for the next beat
  let beatIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const beatDurationSec = () => 60 / bpm;

  const scan = () => {
    const ctx = getAudioContext();
    const horizon = ctx.currentTime + LOOKAHEAD_SEC;
    while (nextBeatTime < horizon) {
      onBeat(beatIndex, nextBeatTime);
      beatIndex += 1;
      nextBeatTime += beatDurationSec();
    }
  };

  return {
    start: () => {
      if (running) return;
      const ctx = getAudioContext();
      // Seed the first beat a hair in the future so we don't try to schedule
      // something in the past (which the audio thread would fire immediately,
      // causing audible jitter on the very first beat).
      nextBeatTime = ctx.currentTime + 0.05;
      beatIndex = 0;
      running = true;
      scan();
      intervalId = setInterval(scan, SCAN_INTERVAL_MS);
    },

    stop: () => {
      running = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },

    isRunning: () => running,

    setBpm: (nextBpm: number) => {
      bpm = Math.max(1, nextBpm);
    },
  };
};
