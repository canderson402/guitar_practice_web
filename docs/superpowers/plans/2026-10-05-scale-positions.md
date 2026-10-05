# Scale Positions (Shapes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Shapes switch on the Fretboard card that narrows the dots to the chosen major-scale positions (7) or pentatonic boxes (5), any combination.

**Architecture:** A pure data module (`src/data/scalePositions.ts`) stores fretjam's 7 major boxes and the 5 minor-pentatonic boxes as fret offsets, derives every mode / major pentatonic by rotation, and returns the set of fretboard cells for the enabled positions. `buildDots` gains an optional `only` filter. The Fretboard card adds a left column (`ShapesColumn`) with the switch and position chips, persisted via card prefs.

**Tech Stack:** React 19 + TypeScript (CRA), zustand stores, Jest + Testing Library (`CI=true npx react-scripts test --watchAll=false <paths>`), CSS modules.

**Spec:** `docs/superpowers/specs/2026-10-05-scale-positions-design.md`

## Global Constraints

- Tuning arrays are in **display order, high E → low E** (`tuning[0]` = high e, `tuning[5]` = low E). Shape tables are written **low E → high e**; app string index = `5 - tableIndex`.
- Cell keys use `posKey(stringIndex, fret)` from `src/components/Fretboard/types.ts` (`"5-8"` = low E, fret 8).
- Pitch classes via `getChromaticPosition` (`src/data/musicData.ts`) — accepts sharps and flats.
- Standard spacing = 6 strings whose adjacent pitch-class gaps, high → low, are `[5, 4, 5, 5, 5]` (E→B 5, B→G 4, G→D 5, D→A 5, A→E 5), at any overall pitch.
- Scale names exactly as in `scales`: `'Major (Ionian)'`, `'Dorian'`, `'Phrygian'`, `'Lydian'`, `'Mixolydian'`, `'Aeolian (Natural Minor)'`, `'Locrian'`, `'Major Pentatonic'`, `'Minor Pentatonic'`.
- Prefs: `useCardPref('fretboard', 'shapes', false)`, `useCardPref('fretboard', 'positions', [1])`.
- Disabled reasons (exact copy): `"No shapes for this scale yet"`, `"Shapes need standard tuning (any pitch)"`.
- **Do not commit.** The user commits only on explicit request; leave changes in the working tree.
- After each task: `npx tsc --noEmit -p .` clean and the touched test files pass.

## Review Focus

1. **Flat-spelled tunings** (E♭ standard entered as `Eb Bb Gb Db Ab Eb`) must count as standard spacing and place boxes one fret higher than E standard → test in Task 1.
2. **Flat-spelled roots** (`Db` major, `Gb` Dorian) must place the same boxes as their sharp spellings → test in Task 1.
3. **Switching 7 → 5 positions** with only 6 and 7 enabled: no chip pressed, All not pressed, board empty, and switching back restores 6 and 7 → test in Task 3.
4. **No key selected** (`root` null) with Shapes on: no crash, no dots → test in Task 1 (`positionCells` returns empty).
5. **Chord showing with Shapes on**: only chord tones *inside* the enabled positions are drawn → test in Task 2.

---

### Task 1: Shape data and placement (`scalePositions.ts`)

**Files:**
- Create: `src/data/scalePositions.ts`
- Test: `src/data/scalePositions.test.ts`

**Interfaces:**
- Consumes: `getChromaticPosition(note: string): number`, `scales` (musicData); `posKey(string: number, fret: number): string` (Fretboard types).
- Produces:
  - `positionCount(scale: string | null): number` — 7, 5 or 0.
  - `shapesAvailable(tuning: string[]): boolean`
  - `positionCells(i: { root: string | null; scale: string | null; tuning: string[]; frets: number; positions: number[] }): Set<string>`

- [ ] **Step 1: Write the failing tests**

```ts
// src/data/scalePositions.test.ts
import { positionCount, shapesAvailable, positionCells } from './scalePositions';
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
  expect(positionCount('Harmonic Minor')).toBe(0);
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
  expect(cells('C', 'Harmonic Minor', [1]).size).toBe(0);
  expect(cells('C', 'Major (Ionian)', [1], ['E', 'B', 'G', 'D', 'A', 'D']).size).toBe(0);
  expect(positionCells({ root: null, scale: 'Major (Ionian)', tuning: STD, frets: 24, positions: [1] }).size).toBe(0);
  expect(cells('C', 'Major (Ionian)', []).size).toBe(0);
  expect(cells('A', 'Minor Pentatonic', [6, 7]).size).toBe(0);   // beyond 5: ignored
});
```

- [ ] **Step 2: Run the tests — expect failure**

Run: `CI=true npx react-scripts test --watchAll=false src/data/scalePositions.test.ts`
Expected: FAIL — `Cannot find module './scalePositions'`.

- [ ] **Step 3: Implement**

```ts
// src/data/scalePositions.ts
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
const MODES: Record<string, { family: keyof typeof FAMILIES; mode: number }> = {
  'Major (Ionian)': { family: 'major', mode: 0 },
  'Dorian': { family: 'major', mode: 1 },
  'Phrygian': { family: 'major', mode: 2 },
  'Lydian': { family: 'major', mode: 3 },
  'Mixolydian': { family: 'major', mode: 4 },
  'Aeolian (Natural Minor)': { family: 'major', mode: 5 },
  'Locrian': { family: 'major', mode: 6 },
  'Minor Pentatonic': { family: 'pentatonic', mode: 0 },
  'Major Pentatonic': { family: 'pentatonic', mode: 1 },
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

/** Every fretboard cell (`posKey`) in the enabled positions, each box repeated
 *  every 12 frets and clipped to the board. Empty when the scale has no shapes,
 *  the tuning isn't standard-spaced, or there's no root. */
export const positionCells = (i: {
  root: string | null; scale: string | null; tuning: string[]; frets: number; positions: number[];
}): Set<string> => {
  const out = new Set<string>();
  const m = i.scale ? MODES[i.scale] : undefined;
  if (!i.root || !m || !shapesAvailable(i.tuning)) return out;
  const { shapes, intervals } = FAMILIES[m.family];
  const n = shapes.length;
  const familyRoot = (getChromaticPosition(i.root) - intervals[m.mode] + 12) % 12;
  const lowString = i.tuning.length - 1;
  const base = (familyRoot - getChromaticPosition(i.tuning[lowString]) + 12) % 12;
  i.positions.filter(p => p >= 1 && p <= n).forEach(p => {
    const shape = shapes[(p - 1 + m.mode) % n];
    // From two octaves down (a high box's top can still reach fret 0–2) up past the last fret.
    for (let shift = -24; base + shift - 1 <= i.frets; shift += 12) {
      shape.forEach((offsets, row) => offsets.forEach(o => {
        const fret = base + shift + o;
        if (fret >= 0 && fret <= i.frets) out.add(posKey(lowString - row, fret));
      }));
    }
  });
  return out;
};
```

- [ ] **Step 4: Run the tests — expect pass**

Run: `CI=true npx react-scripts test --watchAll=false src/data/scalePositions.test.ts`
Expected: PASS (10 tests). If the "scale tone" test fails, a table entry is mistyped — fix the table, not the test.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .` — expected: no output.

---

### Task 2: `buildDots` can be limited to a set of cells

**Files:**
- Modify: `src/v2/cards/fretboard/buildDots.ts` (the `DotInput` interface and `buildDots`)
- Test: `src/v2/cards/fretboard/Fretboard.test.tsx` (inside `describe('buildDots', …)`)

**Interfaces:**
- Produces: `DotInput.only?: Set<string> | null` — when set, only cells whose `posKey` is in it get a dot.

- [ ] **Step 1: Write the failing tests** (add inside the `describe('buildDots', …)` block)

```tsx
  it('with `only`, draws dots just on those cells', () => {
    const only = new Set(['5-5', '5-7', '5-6']);   // A, B, and A# (not in the scale)
    const dots = buildDots({ ...base, only });
    expect(Array.from(dots.keys()).sort()).toEqual(['5-5', '5-7']);
    expect(dots.get('5-5')?.variant).toBe('root');
  });

  it('with `only` and a chord, only chord tones inside the cells are drawn', () => {
    const chord = { root: 'A', pitches: [9, 0, 4] };   // A C E
    const only = new Set(['5-5', '5-7', '5-8', '4-7']);  // A, B, C on low E; E on A string
    const dots = buildDots({ ...base, chord, only, show: { root: true, scale: true, selected: true } });
    expect(Array.from(dots.keys()).sort()).toEqual(['4-7', '5-5', '5-8']);
  });
```

- [ ] **Step 2: Run — expect failure**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/cards/fretboard/Fretboard.test.tsx -t "only"`
Expected: FAIL (dots drawn outside `only`; TS may also flag the unknown property).

- [ ] **Step 3: Implement** — in `buildDots.ts` add to `DotInput` (after `chord`):

```ts
  /** Shapes: when set, only these cells (posKey) get dots. */
  only?: Set<string> | null;
```

and in `buildDots`, skip cells outside it:

```ts
export const buildDots = (i: DotInput): Map<string, DotInfo> => {
  const map = new Map<string, DotInfo>();
  generateFretboard(i.tuning, i.frets).forEach((string, si) => string.forEach(cell => {
    if (!cell || cell.fret > i.frets) return;
    if (i.only && !i.only.has(posKey(si, cell.fret))) return;
    const dot = dotForNote(i, cell.note);
    if (dot) map.set(posKey(si, cell.fret), dot);
  }));
  return map;
};
```

- [ ] **Step 4: Run — expect pass**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/cards/fretboard/Fretboard.test.tsx`
Expected: PASS (all existing tests too).

---

### Task 3: Shapes column on the Fretboard card

**Files:**
- Modify: `src/v2/ui/Switch.tsx` (add `disabled`), `src/v2/ui/Switch.module.css` (disabled look)
- Modify: `src/v2/cards/fretboard/useFretboardPrefs.ts` (two prefs)
- Create: `src/v2/cards/fretboard/ShapesColumn.tsx`
- Modify: `src/v2/cards/fretboard/FretboardFace.tsx` (compute `only`, render column beside the neck)
- Modify: `src/v2/cards/fretboard/FretboardCard.module.css` (`.body`, `.shapes`, `.shapeChips`, `.shapeHint`)
- Test: `src/v2/cards/fretboard/Fretboard.test.tsx`

**Interfaces:**
- Consumes: `positionCount`, `shapesAvailable`, `positionCells` (Task 1); `DotInput.only` (Task 2); `Switch`, `ChipButton` from `../../ui`.
- Produces: `useFretboardPrefs()` adds `shapes: boolean`, `setShapes(v: boolean)`, `positions: number[]`, `setPositions(v: number[])`. `ShapesColumn` props: `{ count: number; reason: string | null; on: boolean; setOn(v: boolean): void; positions: number[]; setPositions(v: number[]): void }`.

- [ ] **Step 1: Write the failing tests** (append to `Fretboard.test.tsx`)

```tsx
describe('Shapes', () => {
  const dotCount = () => screen.queryAllByTestId('fret-dot').length;
  const setup = (scale = 'Major (Ionian)', tuning = STD) => act(() => {
    useV2Store.setState(useV2Store.getInitialState(), true);
    const st = useStore.getState();
    st.setSelectedNote('C'); st.setSelectedScale(scale); st.setTuning(tuning); st.setViewMode('fretboard'); st.setSelectedChord(null);
  });
  afterEach(() => act(() => useStore.getState().setTuning(STD)));

  it('the switch shows position chips (1–7 for major) and narrows the board to position 1', () => {
    setup();
    render(<FretboardFace />);
    const all = dotCount();
    expect(screen.queryByRole('group', { name: 'Positions' })).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Shapes' }));
    const chips = within(screen.getByRole('group', { name: 'Positions' })).getAllByRole('button');
    expect(chips.map(c => c.textContent)).toEqual(['All', '1', '2', '3', '4', '5', '6', '7']);
    expect(screen.getByRole('button', { name: 'Position 1' })).toHaveAttribute('aria-pressed', 'true');
    // C major position 1 on 24 frets: 16 notes at frets 7–10, again at 19–22.
    expect(dotCount()).toBe(32);
    expect(dotCount()).toBeLessThan(all);
    expect(useV2Store.getState().cardPrefs.fretboard).toMatchObject({ shapes: true });
  });

  it('chips toggle positions; All turns every position on', () => {
    setup();
    render(<FretboardFace />);
    fireEvent.click(screen.getByRole('switch', { name: 'Shapes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Position 2' }));
    expect(useV2Store.getState().cardPrefs.fretboard?.positions).toEqual([1, 2]);
    const oneAndTwo = dotCount();
    expect(oneAndTwo).toBeGreaterThan(32);
    fireEvent.click(screen.getByRole('button', { name: 'Position 1' }));
    expect(useV2Store.getState().cardPrefs.fretboard?.positions).toEqual([2]);
    expect(screen.getByRole('button', { name: 'All positions' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'All positions' }));
    expect(useV2Store.getState().cardPrefs.fretboard?.positions).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(screen.getByRole('button', { name: 'All positions' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('pentatonics have 5; positions 6–7 are ignored there and come back for major', () => {
    setup();
    act(() => useV2Store.getState().setCardPref('fretboard', 'shapes', true));
    act(() => useV2Store.getState().setCardPref('fretboard', 'positions', [6, 7]));
    render(<FretboardFace />);
    const majorDots = dotCount();
    expect(majorDots).toBeGreaterThan(0);
    act(() => useStore.getState().setSelectedScale('Minor Pentatonic'));
    const chips = within(screen.getByRole('group', { name: 'Positions' })).getAllByRole('button');
    expect(chips.map(c => c.textContent)).toEqual(['All', '1', '2', '3', '4', '5']);
    expect(chips.filter(c => c.getAttribute('aria-pressed') === 'true')).toHaveLength(0);
    expect(dotCount()).toBe(0);
    act(() => useStore.getState().setSelectedScale('Major (Ionian)'));
    expect(dotCount()).toBe(majorDots);
  });

  it('is disabled, with the reason, for scales without shapes and non-standard tunings — the full scale shows', () => {
    setup('Harmonic Minor');
    act(() => useV2Store.getState().setCardPref('fretboard', 'shapes', true));
    const { unmount } = render(<FretboardFace />);
    expect(screen.getByRole('switch', { name: 'Shapes' })).toBeDisabled();
    expect(screen.getByText('No shapes for this scale yet')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Positions' })).toBeNull();
    expect(dotCount()).toBeGreaterThan(32);
    unmount();
    setup('Major (Ionian)', ['E', 'B', 'G', 'D', 'A', 'D']);
    act(() => useV2Store.getState().setCardPref('fretboard', 'shapes', true));
    render(<FretboardFace />);
    expect(screen.getByRole('switch', { name: 'Shapes' })).toBeDisabled();
    expect(screen.getByText('Shapes need standard tuning (any pitch)')).toBeInTheDocument();
    // The saved choice is kept for when shapes apply again.
    expect(useV2Store.getState().cardPrefs.fretboard?.shapes).toBe(true);
  });

  it('half step down still works', () => {
    setup('Major (Ionian)', ['Eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb']);
    render(<FretboardFace />);
    fireEvent.click(screen.getByRole('switch', { name: 'Shapes' }));
    expect(dotCount()).toBe(32);
  });

  it('the column is hidden in Piano view', () => {
    setup();
    act(() => useStore.getState().setViewMode('piano'));
    render(<FretboardFace />);
    expect(screen.queryByRole('switch', { name: 'Shapes' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/cards/fretboard/Fretboard.test.tsx -t "Shapes"`
Expected: FAIL — no switch named "Shapes".

- [ ] **Step 3: `Switch` gets `disabled`** — replace `src/v2/ui/Switch.tsx`:

```tsx
import React from 'react';
import s from './Switch.module.css';

export const Switch: React.FC<{ label: string; checked: boolean; onChange(v: boolean): void; disabled?: boolean }> = ({ label, checked, onChange, disabled }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
    className={[s.track, checked ? s.on : ''].join(' ')} onClick={() => onChange(!checked)}>
    <span className={s.thumb} />
  </button>
);
```

Append to `src/v2/ui/Switch.module.css`:

```css
.track:disabled { opacity: .4; cursor: default; }
```

- [ ] **Step 4: Prefs** — in `useFretboardPrefs.ts` add before the `return`:

```ts
  const [shapes, setShapes] = useCardPref<boolean>('fretboard', 'shapes', false);
  const [positions, setPositions] = useCardPref<number[]>('fretboard', 'positions', [1]);
```

and add `shapes, setShapes, positions, setPositions` to the returned object.

- [ ] **Step 5: `ShapesColumn.tsx`**

```tsx
import React from 'react';
import s from './FretboardCard.module.css';
import { Switch, ChipButton } from '../../ui';

interface Props {
  /** Positions the scale has (7 or 5; 0 = none). */
  count: number;
  /** Why shapes can't show right now (switch disabled), or null. */
  reason: string | null;
  on: boolean;
  setOn(v: boolean): void;
  positions: number[];
  setPositions(v: number[]): void;
}

/** Left of the neck: the Shapes switch and, when on, All + one chip per
 *  position. Each chip toggles its position; any combination can show. */
export const ShapesColumn: React.FC<Props> = ({ count, reason, on, setOn, positions, setPositions }) => {
  const all = Array.from({ length: count }, (_, i) => i + 1);
  const active = positions.filter(p => p <= count);
  const toggle = (p: number) =>
    setPositions(positions.includes(p) ? positions.filter(x => x !== p) : [...positions, p].sort((a, b) => a - b));
  return (
    <div className={s.shapes}>
      <label className={s.inline}><span className={s.label}>Shapes</span>
        <Switch label="Shapes" checked={on && !reason} disabled={!!reason} onChange={setOn} />
      </label>
      {reason && <span className={s.shapeHint}>{reason}</span>}
      {on && !reason && (
        <div role="group" aria-label="Positions" className={s.shapeChips}>
          <ChipButton className={s.allChip} aria-label="All positions" aria-pressed={active.length === count}
            selected={active.length === count} onClick={() => setPositions(all)}>All</ChipButton>
          {all.map(p => (
            <ChipButton key={p} aria-label={`Position ${p}`} aria-pressed={active.includes(p)} selected={active.includes(p)}
              onClick={() => toggle(p)}>{p}</ChipButton>
          ))}
        </div>
      )}
    </div>
  );
};
```

Note: `toggle` keeps positions above `count` (e.g. 6 and 7 while on a pentatonic) so they return when you switch back to a 7-position scale.

- [ ] **Step 6: Wire into `FretboardFace.tsx`**

Imports:

```tsx
import { positionCount, shapesAvailable, positionCells } from '../../../data/scalePositions';
import { ShapesColumn } from './ShapesColumn';
```

After `const p = useFretboardPrefs();` and `scaleNotes`, add:

```tsx
  // Shapes: only the enabled positions' cells get dots (when the scale and tuning allow).
  const shapeCount = positionCount(n.scale);
  const shapeReason = shapeCount === 0 ? 'No shapes for this scale yet'
    : !shapesAvailable(n.tuning) ? 'Shapes need standard tuning (any pitch)' : null;
  const only = useMemo(() => (p.shapes && !shapeReason
    ? positionCells({ root: n.root, scale: n.scale, tuning: n.tuning, frets: p.frets, positions: p.positions })
    : null), [p.shapes, shapeReason, n.root, n.scale, n.tuning, p.frets, p.positions]);
```

Change the `dots` memo to pass it:

```tsx
  const dots = useMemo(() => buildDots({ ...style, tuning: n.tuning, frets: p.frets, only }), [style, n.tuning, p.frets, only]);
```

Wrap the neck in a row with the column (fretboard view only). Replace:

```tsx
      <div ref={neckRef} className={s.neck} onPointerDownCapture={onNeckPointerDown}>
```
…through its closing `</div>` with:

```tsx
      <div className={s.body}>
        {n.view === 'fretboard' && (
          <ShapesColumn count={shapeCount} reason={shapeReason} on={p.shapes} setOn={p.setShapes}
            positions={p.positions} setPositions={p.setPositions} />
        )}
        <div ref={neckRef} className={s.neck} onPointerDownCapture={onNeckPointerDown}>
          {/* …existing neck contents unchanged… */}
        </div>
      </div>
```

(Move the existing neck children — the piano/fretboard switch and the ripple map — inside unchanged.)

- [ ] **Step 7: CSS** — append to `FretboardCard.module.css`:

```css
/* The neck with the Shapes column on its left. */
.body { flex: 1; min-height: 0; display: flex; gap: var(--space-3); }
.body > .neck { min-width: 0; }
.shapes { flex: none; width: 92px; display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-2); }
.shapeChips { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-1); }
.shapeChips > * { width: 100%; }
.allChip { grid-column: 1 / -1; }
.shapeHint { font-size: var(--text-11); color: var(--text-muted); line-height: 1.3; }
```

- [ ] **Step 8: Run — expect pass**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/cards/fretboard src/data/scalePositions.test.ts`
Expected: PASS.

- [ ] **Step 9: Full check**

Run: `npx tsc --noEmit -p . && npx eslint src/v2/cards/fretboard src/data/scalePositions.ts src/v2/ui/Switch.tsx && CI=true npx react-scripts test --watchAll=false`
Expected: no type or lint errors; all suites pass (any existing test that counts the fretboard bar's controls may need the new column accounted for — update it only if the change is the intended new column).

- [ ] **Step 10: Look at it** — run the app (`/run` skill or `npm start`), open the Fretboard card, turn Shapes on, try C major 1+2, A minor pentatonic, Drop D (disabled), Piano view (hidden). Check the column doesn't squeeze the neck on a narrow window.
