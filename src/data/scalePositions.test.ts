import { positionCount, shapesAvailable, positionCells, positionRegion, positionRegionMap } from './scalePositions';
import { getScaleNotes, getChromaticPosition, scales } from './musicData';
import { generateFretboard } from './guitarData';

const STD = ['E', 'B', 'G', 'D', 'A', 'E'];
const cells = (root: string, scale: string, positions: number[], tuning = STD, frets = 24) =>
  positionCells({ root, scale, tuning, frets, positions });
/** Frets on one string (app index: 0 = high e … 5 = low E), sorted. */
const fretsOn = (set: Set<string>, string: number) =>
  Array.from(set).filter(k => k.startsWith(`${string}-`)).map(k => Number(k.split('-')[1])).sort((a, b) => a - b);

it('knows which scales have shapes', () => {
  expect(positionCount('Major (Ionian)')).toBe(7);
  expect(positionCount('Dorian')).toBe(7);
  expect(positionCount('Locrian')).toBe(7);
  expect(positionCount('Minor Pentatonic')).toBe(5);
  expect(positionCount('Major Pentatonic')).toBe(5);
  expect(positionCount('Chromatic')).toBe(0);
  expect(positionCount(null)).toBe(0);
});

it('shapes need standard spacing on 6 strings, at any pitch', () => {
  expect(shapesAvailable(STD)).toBe(true);
  expect(shapesAvailable(['Eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb'])).toBe(true);   // half step down, flats
  expect(shapesAvailable(['D#', 'A#', 'F#', 'C#', 'G#', 'D#'])).toBe(true);   // same, sharps
  expect(shapesAvailable(['D', 'A', 'F', 'C', 'G', 'D'])).toBe(true);         // whole step down
  expect(shapesAvailable(['A#', 'F', 'C#', 'G#', 'D#', 'A#'])).toBe(true);    // three whole steps down
  expect(shapesAvailable(['E', 'B', 'G', 'D', 'A', 'D'])).toBe(false);        // Drop D
  expect(shapesAvailable(['D', 'A', 'G', 'D', 'A', 'D'])).toBe(false);        // DADGAD
  expect(shapesAvailable(['E', 'B', 'G', 'D', 'A', 'E', 'B'])).toBe(false);   // 7-string
});

it('every cell of every position is a scale tone (catches transcription slips)', () => {
  const board = generateFretboard(STD, 24);
  const check = (root: string, scale: string, n: number) => {
    const pcs = getScaleNotes(root, scale as keyof typeof scales).map(getChromaticPosition);
    for (let p = 1; p <= n; p++) {
      const set = cells(root, scale, [p]);
      expect(set.size).toBeGreaterThan(0);
      set.forEach(k => {
        const [s, f] = k.split('-').map(Number);
        expect(pcs).toContain(getChromaticPosition(board[s][f].note));
      });
    }
  };
  ['F#', 'C', 'Bb'].forEach(r => check(r, 'Major (Ionian)', 7));
  check('D', 'Dorian', 7);
  check('A', 'Minor Pentatonic', 5);
  check('C', 'Major Pentatonic', 5);
});

it('F# major positions match fretjam fret for fret (low octave)', () => {
  // Rows low E → high e as in fretjam's diagrams; app strings 5 → 0.
  const expected: Record<number, number[][]> = {
    1: [[2, 4], [1, 2, 4], [1, 3, 4], [1, 3, 4], [2, 4], [1, 2, 4]],
    2: [[4, 6, 7], [4, 6], [3, 4, 6], [3, 4, 6], [4, 6, 7], [4, 6, 7]],
    3: [[6, 7, 9], [6, 8, 9], [6, 8, 9], [6, 8], [6, 7, 9], [6, 7, 9]],
    4: [[7, 9], [6, 8, 9], [6, 8, 9], [6, 8], [6, 7, 9], [6, 7, 9]],
    5: [[9, 11], [8, 9, 11], [8, 9, 11], [8, 10, 11], [9, 11, 12], [9, 11]],
    6: [[11, 13, 14], [11, 13, 14], [11, 13], [10, 11, 13], [11, 12, 14], [11, 13, 14]],
    7: [[13, 14, 16], [13, 14, 16], [13, 15, 16], [13, 15, 16], [14, 16], [13, 14, 16]],
  };
  for (const [pos, rows] of Object.entries(expected)) {
    const set = cells('F#', 'Major (Ionian)', [Number(pos)], STD, 16);
    rows.forEach((frets, row) => {
      // Partial copies 12 frets lower/higher also fit on 16 frets; keep the diagram's octave.
      const lo = Math.min(...rows.flat()), hi = Math.max(...rows.flat());
      expect(fretsOn(set, 5 - row).filter(f => f >= lo && f <= hi)).toEqual(frets);
    });
  }
});

it('modes start on their own root: D Dorian 1 = C major 2, A Aeolian 1 = C major 6', () => {
  expect(cells('D', 'Dorian', [1])).toEqual(cells('C', 'Major (Ionian)', [2]));
  expect(cells('A', 'Aeolian (Natural Minor)', [1])).toEqual(cells('C', 'Major (Ionian)', [6]));
  expect(cells('B', 'Locrian', [3])).toEqual(cells('C', 'Major (Ionian)', [2]));
});

it('pentatonics: A minor box 1 at fret 5; C major pentatonic 1 = A minor pentatonic 2', () => {
  const box1 = cells('A', 'Minor Pentatonic', [1], STD, 12);
  expect(fretsOn(box1, 5)).toEqual([5, 8]);
  expect(fretsOn(box1, 3)).toEqual([5, 7]);   // G string
  expect(fretsOn(box1, 1)).toEqual([5, 8]);   // B string
  expect(cells('C', 'Major Pentatonic', [1])).toEqual(cells('A', 'Minor Pentatonic', [2]));
});

it('flat and sharp spellings of a root place the same boxes', () => {
  expect(cells('Db', 'Major (Ionian)', [1, 4])).toEqual(cells('C#', 'Major (Ionian)', [1, 4]));
  expect(cells('Gb', 'Dorian', [2])).toEqual(cells('F#', 'Dorian', [2]));
});

it('half step down: same pitches, one fret higher', () => {
  const eb = ['Eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb'];
  expect(fretsOn(cells('F#', 'Major (Ionian)', [1], eb, 12), 5)).toEqual([3, 5]);
  expect(fretsOn(cells('F#', 'Major (Ionian)', [1], STD, 12), 5)).toEqual([2, 4]);
});

it('repeats every 12 frets and clips at the nut and the last fret', () => {
  // E major position 1: root at fret 0, box runs fret -1..2 → the -1s are cut.
  const e = cells('E', 'Major (Ionian)', [1], STD, 24);
  expect(fretsOn(e, 5)).toEqual([0, 2, 12, 14, 24]);
  expect(fretsOn(e, 4)).toEqual([0, 2, 11, 12, 14, 23, 24]);
  // 15-fret board: C major position 1 (root at 8) fits once; the +12 copy (19–22) is gone.
  expect(fretsOn(cells('C', 'Major (Ionian)', [1], STD, 15), 5)).toEqual([8, 10]);
});

it('combines positions; nothing for unknown scale, bad tuning, no root or no positions', () => {
  const one = cells('C', 'Major (Ionian)', [1]);
  const two = cells('C', 'Major (Ionian)', [2]);
  const both = cells('C', 'Major (Ionian)', [1, 2]);
  expect(both.size).toBe(new Set([...Array.from(one), ...Array.from(two)]).size);
  expect(cells('C', 'Chromatic', [1]).size).toBe(0);
  expect(cells('C', 'Major (Ionian)', [1], ['E', 'B', 'G', 'D', 'A', 'D']).size).toBe(0);
  expect(positionCells({ root: null, scale: 'Major (Ionian)', tuning: STD, frets: 24, positions: [1] }).size).toBe(0);
  expect(cells('C', 'Major (Ionian)', []).size).toBe(0);
  expect(cells('A', 'Minor Pentatonic', [6, 7]).size).toBe(0);   // beyond 5: ignored
});

it('the region is each box\'s fret span per string — its scale tones plus the frets between them', () => {
  const region = positionRegion({ root: 'C', scale: 'Major (Ionian)', tuning: STD, frets: 15, positions: [1] });
  // C major position 1 on low E: C (8) and D (10) — the span 8–10 includes C# at 9.
  expect(fretsOn(region, 5)).toEqual([8, 9, 10]);
  // Every scale cell is in the region, and the region adds no other scale tones.
  const scaleCells = cells('C', 'Major (Ionian)', [1], STD, 15);
  scaleCells.forEach(k => expect(region.has(k)).toBe(true));
  const board = generateFretboard(STD, 15);
  const pcs = getScaleNotes('C', 'Major (Ionian)').map(getChromaticPosition);
  const scaleToneCellsInRegion = Array.from(region).filter(k => {
    const [st, f] = k.split('-').map(Number);
    return pcs.includes(getChromaticPosition(board[st][f].note));
  });
  expect(new Set(scaleToneCellsInRegion)).toEqual(scaleCells);
});

it('the region map says which positions each cell is in (shared notes are in two or more)', () => {
  const map = positionRegionMap({ root: 'C', scale: 'Major (Ionian)', tuning: STD, frets: 15, positions: [1, 2] });
  expect(map.get('5-8')).toEqual([1]);        // C: position 1 only
  expect(map.get('5-10')).toEqual([1, 2]);    // D: the top of 1 and the bottom of 2
  expect(map.get('5-12')).toEqual([2]);
  expect(map.has('5-6')).toBe(false);
  expect(new Set(Array.from(map.keys()))).toEqual(positionRegion({ root: 'C', scale: 'Major (Ionian)', tuning: STD, frets: 15, positions: [1, 2] }));
  // Positions 3 and 4 share almost every note: three-way overlaps exist with 2.
  const three = positionRegionMap({ root: 'C', scale: 'Major (Ionian)', tuning: STD, frets: 24, positions: [2, 3, 4] });
  expect(Array.from(three.values()).some(ps => ps.length === 3)).toBe(true);
});

describe('harmonic minor and Phrygian dominant: a mode with one note raised a half step', () => {
  it('have 7 positions', () => {
    expect(positionCount('Harmonic Minor')).toBe(7);
    expect(positionCount('Phrygian Dominant')).toBe(7);
  });

  it('every box holds only scale tones, and all 7 of them', () => {
    const board = generateFretboard(STD, 24);
    const check = (root: string, scale: string) => {
      const pcs = getScaleNotes(root, scale as keyof typeof scales).map(getChromaticPosition);
      for (let p = 1; p <= 7; p++) {
        const set = cells(root, scale, [p], STD, 24);
        const found = new Set<number>();
        set.forEach(k => {
          const [s, f] = k.split('-').map(Number);
          const pc = getChromaticPosition(board[s][f].note);
          expect(pcs).toContain(pc);
          found.add(pc);
        });
        expect(found.size).toBe(7);
      }
    };
    ['A', 'E', 'C#', 'Bb'].forEach(r => { check(r, 'Harmonic Minor'); check(r, 'Phrygian Dominant'); });
  });

  it('A harmonic minor 1: A Aeolian 1 with each G raised to G#, staying in the box (frets 4–8)', () => {
    const harmonic = cells('A', 'Harmonic Minor', [1], STD, 12);
    expect(harmonic.size).toBe(cells('A', 'Aeolian (Natural Minor)', [1], STD, 12).size);
    // G on the D string (5) → G# at 6, still in the box.
    expect(fretsOn(harmonic, 3)).toEqual([6, 7]);
    // G on the B string (8) would go to 9, past the box: the same G# is played
    // on the high e string at fret 4 instead.
    expect(fretsOn(harmonic, 1)).toEqual([5, 6]);
    expect(fretsOn(harmonic, 0)).toEqual([4, 5, 7, 8]);
  });

  it('a raised note never sticks out past its box\'s top fret (except on the high e string)', () => {
    for (const [root, scale, mode] of [['A', 'Harmonic Minor', 'Aeolian (Natural Minor)'], ['E', 'Phrygian Dominant', 'Phrygian']]) {
      for (let p = 1; p <= 7; p++) {
        const top = Math.max(...Array.from(cells(root, mode, [p], STD, 15)).map(k => +k.split('-')[1]));
        const tooHigh = Array.from(cells(root, scale, [p], STD, 15)).filter(k => !k.startsWith('0-') && +k.split('-')[1] > top);
        expect(tooHigh).toEqual([]);
      }
    }
  });

  it('E Phrygian dominant is the 5th mode of A harmonic minor: the same boxes, numbered from E', () => {
    // A harmonic minor position 5 starts on its 5th degree, E.
    expect(cells('E', 'Phrygian Dominant', [1])).toEqual(cells('A', 'Harmonic Minor', [5]));
    expect(cells('E', 'Phrygian Dominant', [3])).toEqual(cells('A', 'Harmonic Minor', [7]));
  });
});
