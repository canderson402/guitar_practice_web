import { CIRCLE_KEYS } from '../../shell/KeyPicker';
import { chromaticPosition } from '../../music/intervals';

export type Direction = 'clockwise' | 'counterclockwise';
export type ChangeMode = 'none' | 'bars' | 'beats' | 'time';

/** The next note to practice: one step around the circle of fifths
 *  (clockwise) or fourths (counterclockwise), or a random different key. */
export const nextKey = (current: string, direction: Direction, random: boolean): string => {
  const pc = chromaticPosition(current);
  const i = Math.max(0, CIRCLE_KEYS.findIndex(k => chromaticPosition(k) === pc));
  if (random) {
    let j = i;
    while (j === i) j = Math.floor(Math.random() * CIRCLE_KEYS.length);
    return CIRCLE_KEYS[j];
  }
  return CIRCLE_KEYS[(i + (direction === 'clockwise' ? 1 : -1) + 12) % 12];
};

/** Whether a heard beat is a change point. Bars: the downbeat starting every
 *  Nth bar. Beats: every N beats after the count-in. */
export const shouldAdvance = (
  mode: ChangeMode, ev: { beatCount: number; barIndex: number; beatInBar: number }, interval: number, countIn: number,
): boolean => {
  if (mode === 'bars') return ev.beatInBar === 0 && ev.barIndex > 0 && ev.barIndex % interval === 0;
  if (mode === 'beats') { const m = ev.beatCount - countIn; return m > 0 && m % interval === 0; }
  return false;
};

const samePitch = (a: string, b: string) => chromaticPosition(a) === chromaticPosition(b);

/** Records `note` as played this round (by pitch). After all 12, the round
 *  starts over with `note` as its first. */
export const markPlayed = (played: string[], note: string): string[] => {
  if (played.length >= CIRCLE_KEYS.length) return [note];
  return played.some(p => samePitch(p, note)) ? played : [...played, note];
};

/** "Out of a hat": a random key not yet played this round. When every key has
 *  been played, any key other than the current one (a new round begins). */
export const nextFromHat = (current: string, played: string[]): string => {
  const left = CIRCLE_KEYS.filter(k => !played.some(p => samePitch(p, k)));
  const pool = left.length ? left : CIRCLE_KEYS.filter(k => !samePitch(k, current));
  return pool[Math.floor(Math.random() * pool.length)];
};
