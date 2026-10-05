import { getChromaticPosition } from './musicData';
import { posKey } from '../components/Fretboard/types';

// Scale positions ("shapes"): boxes you play the scale in without moving
// your hand. Each is stored per string, LOW E → HIGH e, as fret offsets from
// the family's root on the low E string. The major boxes are fretjam's
// (https://www.fretjam.com/major-scale-positions.html); positions 3 and 4
// differ only on the low E string, as there.
type Shape = number[][];

const MAJOR: Shape[] = [
  [[0, 2], [-1, 0, 2], [-1, 1, 2], [-1, 1, 2], [0, 2], [-1, 0, 2]],
  [[2, 4, 5], [2, 4], [1, 2, 4], [1, 2, 4], [2, 4, 5], [2, 4, 5]],
  [[4, 5, 7], [4, 6, 7], [4, 6, 7], [4, 6], [4, 5, 7], [4, 5, 7]],
  [[5, 7], [4, 6, 7], [4, 6, 7], [4, 6], [4, 5, 7], [4, 5, 7]],
  [[7, 9], [6, 7, 9], [6, 7, 9], [6, 8, 9], [7, 9, 10], [7, 9]],
  [[9, 11, 12], [9, 11, 12], [9, 11], [8, 9, 11], [9, 10, 12], [9, 11, 12]],
  [[11, 12, 14], [11, 12, 14], [11, 13, 14], [11, 13, 14], [12, 14], [11, 12, 14]],
];

// The five minor-pentatonic boxes (box 1 = the classic one, e.g. A minor at fret 5).
const MINOR_PENTATONIC: Shape[] = [
  [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]],
  [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]],
  [[5, 7], [5, 7], [5, 7], [4, 7], [5, 8], [5, 7]],
  [[7, 10], [7, 10], [7, 9], [7, 9], [8, 10], [7, 10]],
  [[10, 12], [10, 12], [9, 12], [9, 12], [10, 12], [10, 12]],
];

// Every scale with shapes is a "mode" of one family: its root sits `interval`
// semitones above the family root, and its position k is the family's
// position ((k - 1 + mode) mod n) + 1 — so each scale's position 1 is the box
// with its own root on the low E string (D Dorian 1 = C major 2).
const FAMILIES = {
  major: { shapes: MAJOR, intervals: [0, 2, 4, 5, 7, 9, 11] },
  pentatonic: { shapes: MINOR_PENTATONIC, intervals: [0, 3, 5, 7, 10] },
};
// A scale can also be a mode with one note raised a half step (`raise`: that
// note's semitones above the scale's root): harmonic minor is Aeolian with ♭7
// → 7, Phrygian dominant is Phrygian with ♭3 → 3. Its boxes are the mode's,
// with that note moved up one fret wherever it appears — same notes per box.
// Where that would push it past the box's top fret, it's played on the next
// string up instead (A harmonic minor 1: G# on the high e at 4, not the B at 9).
const MODES: Record<string, { family: keyof typeof FAMILIES; mode: number; raise?: number }> = {
  'Major (Ionian)': { family: 'major', mode: 0 },
  'Dorian': { family: 'major', mode: 1 },
  'Phrygian': { family: 'major', mode: 2 },
  'Lydian': { family: 'major', mode: 3 },
  'Mixolydian': { family: 'major', mode: 4 },
  'Aeolian (Natural Minor)': { family: 'major', mode: 5 },
  'Locrian': { family: 'major', mode: 6 },
  'Minor Pentatonic': { family: 'pentatonic', mode: 0 },
  'Major Pentatonic': { family: 'pentatonic', mode: 1 },
  'Harmonic Minor': { family: 'major', mode: 5, raise: 10 },
  'Phrygian Dominant': { family: 'major', mode: 2, raise: 3 },
};

/** How many positions a scale has (0 = no shapes). */
export const positionCount = (scale: string | null): number => {
  const m = scale ? MODES[scale] : undefined;
  return m ? FAMILIES[m.family].shapes.length : 0;
};

// Gaps between adjacent strings, high e → low E, in standard tuning.
const STANDARD_GAPS = [5, 4, 5, 5, 5];

/** Shapes fit any 6-string tuning spaced like standard, at any pitch
 *  (E standard, half a step down, D standard…) — not Drop D, DADGAD, 7-string. */
export const shapesAvailable = (tuning: string[]): boolean =>
  tuning.length === 6 && STANDARD_GAPS.every((gap, i) =>
    (getChromaticPosition(tuning[i]) - getChromaticPosition(tuning[i + 1]) + 12) % 12 === gap);

type Placement = { root: string | null; scale: string | null; tuning: string[]; frets: number; positions: number[] };

/** Each enabled box placed on the neck, every 12 frets: for each string (app
 *  index), the frets of its notes (unclipped), tagged with its position. Nothing when the scale has no
 *  shapes, the tuning isn't standard-spaced, or there's no root. */
const placeBoxes = (i: Placement): { position: number; string: number; frets: number[] }[] => {
  const m = i.scale ? MODES[i.scale] : undefined;
  if (!i.root || !m || !shapesAvailable(i.tuning)) return [];
  const { shapes, intervals } = FAMILIES[m.family];
  const n = shapes.length;
  const familyRoot = (getChromaticPosition(i.root) - intervals[m.mode] + 12) % 12;
  const lowString = i.tuning.length - 1;
  const base = (familyRoot - getChromaticPosition(i.tuning[lowString]) + 12) % 12;
  // The note to move up a fret (pitch class before raising), if any.
  const raised = m.raise === undefined ? null : (getChromaticPosition(i.root) + m.raise) % 12;
  const out: { position: number; string: number; frets: number[] }[] = [];
  i.positions.filter(p => p >= 1 && p <= n).forEach(p => {
    const shape = shapes[(p - 1 + m.mode) % n];
    // From two octaves down (a high box's top can still reach fret 0–2) up past the last fret.
    for (let shift = -24; base + shift - 1 <= i.frets; shift += 12) {
      // Strings low → high (app index lowString … 0), frets before any raise.
      const rows = shape.map((offsets, row) => ({ string: lowString - row, frets: offsets.map(o => base + shift + o) }));
      if (raised !== null) {
        const top = Math.max(...rows.flatMap(r => r.frets));
        rows.forEach((r, row) => {
          const open = getChromaticPosition(i.tuning[r.string]);
          r.frets = r.frets.flatMap(f => {
            if ((open + f + 120) % 12 !== raised) return [f];
            // Raised past the box's top fret: play the same pitch on the next
            // string up instead (the high e string keeps the stretch).
            const next = rows[row + 1];
            if (f + 1 <= top || !next) return [f + 1];
            const gap = (getChromaticPosition(i.tuning[next.string]) - open + 12) % 12;
            next.frets = [f + 1 - gap, ...next.frets];
            return [];
          });
        });
      }
      rows.forEach(r => out.push({ position: p, string: r.string, frets: r.frets.sort((a, b) => a - b) }));
    }
  });
  return out;
};

/** Every fretboard cell (`posKey`) holding a note of the enabled positions,
 *  clipped to the board. */
export const positionCells = (i: Placement): Set<string> => {
  const out = new Set<string>();
  placeBoxes(i).forEach(({ string, frets }) => frets.forEach(f => {
    if (f >= 0 && f <= i.frets) out.add(posKey(string, f));
  }));
  return out;
};

/** The neck the enabled positions cover: on each string, every fret from the
 *  box's lowest note to its highest, with the positions (sorted) each cell is
 *  in — two or more where boxes overlap. Its scale tones are exactly
 *  `positionCells`; the frets between let a selected note or chord tone
 *  outside the key still show inside a box. */
export const positionRegionMap = (i: Placement): Map<string, number[]> => {
  const out = new Map<string, number[]>();
  placeBoxes(i).forEach(({ position, string, frets }) => {
    for (let f = Math.max(0, Math.min(...frets)); f <= Math.min(i.frets, Math.max(...frets)); f++) {
      const key = posKey(string, f);
      const list = out.get(key) ?? [];
      if (!list.includes(position)) out.set(key, [...list, position].sort((a, b) => a - b));
    }
  });
  return out;
};

/** The cells `positionRegionMap` covers. */
export const positionRegion = (i: Placement): Set<string> => new Set(Array.from(positionRegionMap(i).keys()));
