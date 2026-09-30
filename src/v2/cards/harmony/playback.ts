import { getAudioContext } from '../../../audio/engine';
import { playGuitarNote } from '../../../audio/guitar';

// Start just ahead of now so the first step isn't late.
const LEAD_SEC = 0.1;
// Each step is handed to the audio clock this long before it sounds —
// late enough that Stop can still cancel everything after the current step.
const QUEUE_AHEAD_MS = 100;

/** Play `steps` (each a set of MIDI notes sounded together) as quarter notes
 *  at `bpm`, on exact audio-clock times so there's no drift. `onStep` fires
 *  as each step is heard; `onDone` when it ends or is stopped. Returns stop. */
export const playSteps = (
  steps: number[][], bpm: number, onStep: (index: number) => void, onDone: () => void,
): (() => void) => {
  const ctx = getAudioContext();
  const beat = 60 / bpm;
  const start = ctx.currentTime + LEAD_SEC;
  const msUntil = (t: number) => Math.max(0, (t - ctx.currentTime) * 1000);
  const timers: number[] = [];
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(id => window.clearTimeout(id));
    onDone();
  };

  steps.forEach((notes, i) => {
    const t = start + i * beat;
    timers.push(window.setTimeout(() => {
      notes.forEach(midi => { void playGuitarNote(midi, beat * 0.95, t); });
    }, Math.max(0, msUntil(t) - QUEUE_AHEAD_MS)));
    timers.push(window.setTimeout(() => onStep(i), msUntil(t)));
  });
  timers.push(window.setTimeout(finish, msUntil(start + steps.length * beat)));
  return finish;
};
