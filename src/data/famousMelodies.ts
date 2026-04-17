import type { Label } from '../logic/noteReadingLogic';
import type { Duration } from '../components/GrandStaff';

export type MelodyElement =
  | { kind: 'note'; midi: number; spelling: Label; duration: Duration }
  | { kind: 'rest'; duration: Duration };

export interface TimeSignature {
  /** Numerator — beats per measure. */
  beats: number;
  /** Denominator — note value that gets one beat (2 = half, 4 = quarter, 8 = eighth). */
  beatValue: 2 | 4 | 8;
}

export interface Melody {
  id: string;
  title: string;
  timeSignature: TimeSignature;
  /** Key signature label (e.g. 'C', 'G', 'Bb'). Optional — if omitted the
   *  staff is drawn with no key signature and every accidental inline. */
  keySignature?: string;
  /** Elements are grouped into measures. Each inner array is one measure. The
   *  sum of durations in a measure must equal `timeSignature.beats` worth of
   *  beats (converted from `beatValue`). */
  measures: MelodyElement[][];
}

const DURATION_QUARTERS: Record<Duration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

/** Flat list of every element across all measures, in playback order. */
export const flattenMelody = (melody: Melody): MelodyElement[] =>
  melody.measures.flat();

/** Count only note elements (skipping rests) — the authoritative length
 *  when walking a melody in a note-by-note exercise. */
export const countPlayableNotes = (melody: Melody): number =>
  flattenMelody(melody).filter(e => e.kind === 'note').length;

/** Get the Nth note-element of a melody, skipping rests. */
export const getPlayableNote = (
  melody: Melody,
  noteIndex: number,
): { kind: 'note'; midi: number; spelling: Label; duration: Duration } | null => {
  let i = 0;
  for (const el of flattenMelody(melody)) {
    if (el.kind !== 'note') continue;
    if (i === noteIndex) return el;
    i += 1;
  }
  return null;
};

/** Duration in seconds at a given quarter-note BPM. */
export const durationToSeconds = (duration: Duration, bpm: number): number => {
  const quarterSec = 60 / bpm;
  return DURATION_QUARTERS[duration] * quarterSec;
};
