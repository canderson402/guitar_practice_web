// Where the two notes of an interval sit on a standard-tuned guitar.

/** Open-string MIDI notes in fretboard display order: high e (0) … low E (5). */
export const OPEN_STRINGS = [64, 59, 55, 50, 45, 40];
export const STANDARD_TUNING = ['E', 'B', 'G', 'D', 'A', 'E'];
export const GUITAR_FRETS = 15;

export interface FretPos { string: number; fret: number }

const positionsOf = (midi: number): FretPos[] =>
  OPEN_STRINGS
    .map((open, string) => ({ string, fret: midi - open }))
    .filter(p => p.fret >= 0 && p.fret <= GUITAR_FRETS);

/** The pair of positions a player would reach for: a small fret span, near
 *  strings, low on the neck. */
export const guitarPositions = (first: number, second: number): [FretPos, FretPos] => {
  let best: [FretPos, FretPos] | null = null;
  let bestScore = Infinity;
  for (const a of positionsOf(first)) {
    for (const b of positionsOf(second)) {
      if (a.string === b.string && a.fret === b.fret) continue;
      const score = Math.abs(a.fret - b.fret) * 3 + Math.abs(a.string - b.string) + Math.max(a.fret, b.fret) * 0.5;
      if (score < bestScore) { bestScore = score; best = [a, b]; }
    }
  }
  return best ?? [positionsOf(first)[0], positionsOf(second)[0]];
};
