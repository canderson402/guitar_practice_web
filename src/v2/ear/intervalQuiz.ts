// Interval ear training: the question generator and score table. Pure — the
// page plays the notes and keeps the session.

export type Instrument = 'guitar' | 'piano';
export type DirectionSetting = 'ascending' | 'descending' | 'both' | 'harmonic';
export type Direction = 'ascending' | 'descending' | 'harmonic';

export interface IntervalInfo { semitones: number; short: string; name: string }

export const INTERVALS: IntervalInfo[] = [
  { semitones: 1, short: 'm2', name: 'Minor 2nd' },
  { semitones: 2, short: 'M2', name: 'Major 2nd' },
  { semitones: 3, short: 'm3', name: 'Minor 3rd' },
  { semitones: 4, short: 'M3', name: 'Major 3rd' },
  { semitones: 5, short: 'P4', name: 'Perfect 4th' },
  { semitones: 6, short: 'TT', name: 'Tritone' },
  { semitones: 7, short: 'P5', name: 'Perfect 5th' },
  { semitones: 8, short: 'm6', name: 'Minor 6th' },
  { semitones: 9, short: 'M6', name: 'Major 6th' },
  { semitones: 10, short: 'm7', name: 'Minor 7th' },
  { semitones: 11, short: 'M7', name: 'Major 7th' },
  { semitones: 12, short: 'Oct', name: 'Octave' },
];

export const intervalInfo = (semitones: number): IntervalInfo =>
  INTERVALS.find(i => i.semitones === semitones) ?? INTERVALS[0];

export const PRESETS = {
  simple: [4, 7, 12],
  diatonic: [2, 4, 5, 7, 9, 11, 12],
  all: INTERVALS.map(i => i.semitones),
};

/** Keys that answer, in interval order (m2 … Oct). */
export const HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

/** Both notes of every question stay inside the instrument's natural range:
 *  guitar from low E to the high E string's 12th fret, piano C3–C6. */
export const RANGES: Record<Instrument, { low: number; high: number }> = {
  guitar: { low: 40, high: 76 },
  piano: { low: 48, high: 84 },
};

/** Seconds between the two notes of a melodic interval. */
export const NOTE_GAP = 1.0;

/** With "Fixed root", the first note played is always middle C. */
export const FIXED_ROOT = 60;

export interface Question { low: number; semitones: number; direction: Direction }

export interface QuizSettings {
  intervals: number[];
  direction: DirectionSetting;
  fixedRoot: boolean;
  instrument: Instrument;
}

/** "Down": the first note is the root and the second is that interval's note
 *  of the root, in the octave below — so a major 7th down from E is the D#
 *  just below it, and an octave down is the E an octave below. This is how far
 *  below the root the second note sits. */
export const downSpan = (semitones: number): number => (semitones >= 12 ? 12 : 12 - semitones);

/** How far apart the two notes are, in semitones. */
const span = (semitones: number, direction: Direction): number =>
  direction === 'descending' ? downSpan(semitones) : semitones;

/** The two notes in playing order (harmonic: both sound together). `low` is
 *  the lower of the two notes. */
export const questionNotes = (q: Question): [number, number] => {
  const gap = span(q.semitones, q.direction);
  return q.direction === 'descending' ? [q.low + gap, q.low] : [q.low, q.low + gap];
};

/** A question whose first note is `first`. */
export const questionFrom = (first: number, semitones: number, direction: Direction): Question =>
  ({ low: direction === 'descending' ? first - span(semitones, direction) : first, semitones, direction });

/** Toggle one interval; never fewer than two stay selected. */
export const toggleInterval = (selected: number[], semitones: number): number[] => {
  if (selected.includes(semitones)) {
    return selected.length <= 2 ? selected : selected.filter(s => s !== semitones);
  }
  return [...selected, semitones].sort((a, b) => a - b);
};

const pick = <T,>(items: T[], rng: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

const sameQuestion = (a: Question, b: Question) =>
  a.low === b.low && a.semitones === b.semitones && a.direction === b.direction;

const generate = (settings: QuizSettings, rng: () => number): Question => {
  const semitones = pick(settings.intervals, rng);
  const direction: Direction = settings.direction === 'both'
    ? pick<Direction>(['ascending', 'descending'], rng)
    : settings.direction;
  if (settings.fixedRoot) return questionFrom(FIXED_ROOT, semitones, direction);
  const { low: min, high } = RANGES[settings.instrument];
  const low = min + Math.floor(rng() * (high - span(semitones, direction) - min + 1));
  return { low, semitones, direction };
};

/** A random question from the settings, different from `previous`. */
export const pickQuestion = (settings: QuizSettings, rng: () => number = Math.random, previous?: Question): Question => {
  let q = generate(settings, rng);
  for (let tries = 0; previous && sameQuestion(q, previous) && tries < 20; tries += 1) q = generate(settings, rng);
  return q;
};
