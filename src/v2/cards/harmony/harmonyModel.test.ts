import { resolvePairs, buildHarmonyDots, clickAction, sameNotePositions, nearest, harmonyOrder } from './harmonyModel';
import { generateFretboard } from '../../../data/guitarData';
import { posKey } from '../../../components/Fretboard/types';
import { cellToMidi } from '../../../data/pitch';

const STD = ['E', 'B', 'G', 'D', 'A', 'E'];
const board = generateFretboard(STD, 12);
const third = { kind: 'diatonic' as const, degrees: 2 };
// C on the A string (string index 4, fret 3), D on the A string (fret 5).
const notes = [
  { stringIndex: 4, fret: 3, interval: third, voicingIdx: 0 },
  { stringIndex: 4, fret: 5, interval: third, voicingIdx: 0 },
];
const pairs = () => resolvePairs(notes, 'C', 'Major (Ionian)', board, 12, STD);

it('resolves each note to its harmony in the key, with every spot it could be played', () => {
  const [c, d] = pairs();
  expect(c.baseName).toBe('C');
  expect(c.selected?.note).toBe('E');
  expect(d.selected?.note).toBe('F');
  expect(c.voicings.length).toBeGreaterThan(1);
  expect(c.diatonic).toBe(true);
});

it('labels dots with the play order by default (a harmony shares its note\'s number), or with note names', () => {
  const p = pairs();
  const byOrder = buildHarmonyDots({ pairs: p, labels: 'order', choosing: null });
  expect(byOrder.get(posKey(4, 3))).toMatchObject({ variant: 'base', label: '1' });
  expect(byOrder.get(posKey(4, 5))).toMatchObject({ variant: 'base', label: '2' });
  const h1 = p[0].selected!;
  expect(byOrder.get(posKey(h1.stringIndex, h1.fret))).toMatchObject({ variant: 'harmony', label: '1' });
  const byName = buildHarmonyDots({ pairs: p, labels: 'notes', choosing: null });
  expect(byName.get(posKey(4, 3))?.label).toBe('C');
  expect(byName.get(posKey(h1.stringIndex, h1.fret))?.label).toBe('E');
});

it('while choosing a spot for one harmony, its other spots show as alternates', () => {
  const p = pairs();
  const dots = buildHarmonyDots({ pairs: p, labels: 'order', choosing: p[0].key });
  const alternates = Array.from(dots.values()).filter(d => d.variant === 'alternate');
  expect(alternates.length).toBe(p[0].voicings.length - 1);
});

it('your notes win when a harmony lands on the same fret', () => {
  const p = resolvePairs([{ stringIndex: 4, fret: 3, interval: third, voicingIdx: 0 }], 'C', 'Major (Ionian)', board, 12, STD);
  const h = p[0].selected!;
  const both = resolvePairs([...notes.slice(0, 1), { stringIndex: h.stringIndex, fret: h.fret, interval: third, voicingIdx: 0 }], 'C', 'Major (Ionian)', board, 12, STD);
  expect(buildHarmonyDots({ pairs: both, labels: 'order', choosing: null }).get(posKey(h.stringIndex, h.fret))?.variant).toBe('base');
});

it('works out what a click means', () => {
  const p = pairs();
  const h1 = p[0].selected!;
  const alt = p[0].voicings.find((_, i) => i !== p[0].selectedIdx)!;
  expect(clickAction(p, null, 0, 1)).toEqual({ kind: 'toggleBase' });                              // empty fret: add
  expect(clickAction(p, null, 4, 3)).toEqual({ kind: 'toggleBase' });                              // your note: remove
  expect(clickAction(p, null, h1.stringIndex, h1.fret)).toEqual({ kind: 'choose', pair: p[0].key }); // a harmony: choose its spot
  expect(clickAction(p, p[0].key, alt.stringIndex, alt.fret)).toEqual({ kind: 'pick', pair: p[0].key, index: p[0].voicings.indexOf(alt) });
  expect(clickAction(p, p[0].key, 0, 1)).toEqual({ kind: 'stopChoosing' });                        // anywhere else: cancel
});

describe('dragging', () => {
  it('finds the same note elsewhere on the neck, and snaps a drop to the nearest option', () => {
    // C on the A string (4,3): C is also on low E fret 8, D string fret 10, G string fret 5, B string fret 1, high e fret 8.
    const others = sameNotePositions(board, 4, 3, 12);
    expect(others).toEqual(expect.arrayContaining([{ stringIndex: 5, fret: 8 }, { stringIndex: 2, fret: 5 }, { stringIndex: 1, fret: 1 }]));
    expect(others).not.toContainEqual({ stringIndex: 4, fret: 3 });
    expect(nearest([{ stringIndex: 4, fret: 3 }, { stringIndex: 5, fret: 8 }], 5, 7)).toBe(1);
    expect(nearest([{ stringIndex: 4, fret: 3 }, { stringIndex: 5, fret: 8 }], 4, 4)).toBe(0);
  });

  it('your notes and chosen harmonies can be dragged; dragging a note shows its other spots', () => {
    const p = pairs();
    const dots = buildHarmonyDots({ pairs: p, labels: 'order', choosing: null, movingBase: { pair: p[0].key, positions: sameNotePositions(board, 4, 3, 12) } });
    expect(dots.get(posKey(4, 3))).toMatchObject({ variant: 'base', draggable: true });
    expect(dots.get(posKey(p[0].selected!.stringIndex, p[0].selected!.fret))).toMatchObject({ variant: 'harmony', draggable: true });
    expect(dots.get(posKey(5, 8))).toMatchObject({ variant: 'alternate', label: '1' });
  });
});

it('the key\'s notes show underneath as faint grey dots (root included), never over your notes or harmonies', () => {
  const p = pairs();
  const dots = buildHarmonyDots({ pairs: p, labels: 'order', choosing: null, keyNotes: { root: 'C', scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], board, fretCount: 12 } });
  expect(dots.get(posKey(0, 1))).toMatchObject({ faint: true, color: 'var(--text-muted)' });   // F on high e
  expect(dots.get(posKey(1, 1))).toMatchObject({ faint: true, color: 'var(--text-muted)' });   // C (the root) — grey too
  expect(dots.has(posKey(0, 2))).toBe(false);                                                   // F# isn't in C
  expect(dots.get(posKey(4, 3))?.variant).toBe('base');
});

it('a note not yet harmonized (placed since the last Apply) has no harmony', () => {
  const [p] = resolvePairs([{ ...notes[0], harmonized: false }], 'C', 'Major (Ionian)', board, 12, STD);
  expect(p.selected).toBeNull();
  expect(p.voicings).toEqual([]);
  // Notes saved before this existed count as harmonized.
  expect(resolvePairs([notes[0]], 'C', 'Major (Ionian)', board, 12, STD)[0].selected?.note).toBe('E');
});

it('a harmony never hides under another dot: if its spot is taken it uses the next nearest free one', () => {
  // A, B, C on the low E string (frets 5, 7, 8) and G on the A string (fret 10), a 6th above in C.
  const sixth = { kind: 'diatonic' as const, degrees: 5 };
  const ns = [[5, 5], [5, 7], [5, 8], [4, 10]].map(([stringIndex, fret]) => ({ stringIndex, fret, interval: sixth, voicingIdx: 0 }));
  const p = resolvePairs(ns, 'C', 'Major (Ionian)', board, 12, STD);
  expect(p.map(x => x.selected?.note)).toEqual(['F', 'G', 'A', 'E']);
  // C's 6th (A) is nearest at low E fret 5 — where your first note is — so it moves.
  expect(p[2].selected).not.toMatchObject({ stringIndex: 5, fret: 5 });
  const dots = buildHarmonyDots({ pairs: p, labels: 'order', choosing: null });
  const harmonies = Array.from(dots.values()).filter(d => d.variant === 'harmony').map(d => d.label).sort();
  expect(harmonies).toEqual(['1', '2', '3', '4']);
});

it('the key overlay leaves open strings alone (the string names stay readable)', () => {
  const dots = buildHarmonyDots({ pairs: [], labels: 'order', choosing: null, keyNotes: { root: 'C', scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], board, fretCount: 12 } });
  expect(dots.has(posKey(0, 0))).toBe(false);
});

describe('smart harmony placement (playable shapes)', () => {
  // The notes from the screenshot: G A B on the low E string, F on the A string, B C on the D string; a 3rd in C.
  const ns = [[5, 3], [5, 5], [5, 7], [4, 8], [3, 9], [3, 10]].map(([stringIndex, fret]) => ({ stringIndex, fret, interval: third, voicingIdx: 0 }));
  const midi = (v: { stringIndex: number; fret: number }) => cellToMidi(STD, v.stringIndex, v.fret);

  it('puts each harmony on another string (so both can be played), exactly the interval above, within reach', () => {
    const p = resolvePairs(ns, 'C', 'Major (Ionian)', board, 12, STD);
    expect(p.map(x => x.selected!.note)).toEqual(['B', 'C', 'D', 'A', 'D', 'E']);
    p.forEach(x => {
      const h = x.selected!;
      expect(h.stringIndex).not.toBe(x.note.stringIndex);
      expect([3, 4]).toContain(midi(h) - midi(x.note));          // a 3rd above, not an octave further
      expect(Math.abs(h.fret - x.note.fret)).toBeLessThanOrEqual(4);
    });
  });

  it('a spot you picked is kept (if it\'s still a spot for that harmony)', () => {
    const [auto] = resolvePairs([ns[0]], 'C', 'Major (Ionian)', board, 12, STD);
    const other = auto.voicings.find(v => v !== auto.selected)!;
    const [picked] = resolvePairs([{ ...ns[0], harmonyAt: { stringIndex: other.stringIndex, fret: other.fret } }], 'C', 'Major (Ionian)', board, 12, STD);
    expect(picked.selected).toEqual(other);
    const [stale] = resolvePairs([{ ...ns[0], harmonyAt: { stringIndex: 0, fret: 0 } }], 'C', 'Major (Ionian)', board, 12, STD);
    expect(stale.selected).toEqual(auto.selected);
  });
});

describe('separate melody and harmony orders', () => {
  it('harmonies are ordered by their own rank; harmony dots are numbered in that order', () => {
    const ns = [{ ...notes[0], harmonyRank: 1 }, { ...notes[1], harmonyRank: 0 }];
    const p = resolvePairs(ns, 'C', 'Major (Ionian)', board, 12, STD);
    expect(harmonyOrder(p).map(x => x.baseName)).toEqual(['D', 'C']);
    const dots = buildHarmonyDots({ pairs: p, labels: 'order', choosing: null });
    expect(dots.get(posKey(p[1].selected!.stringIndex, p[1].selected!.fret))?.label).toBe('1');   // D's harmony is first
    expect(dots.get(posKey(4, 3))?.label).toBe('1');                                              // C is still melody 1
  });


});
