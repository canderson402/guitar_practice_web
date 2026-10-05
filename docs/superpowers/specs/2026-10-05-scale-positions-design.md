# Scale Positions (Shapes) on the Fretboard — Design

Date: 2026-10-05
Status: approved in chat, awaiting spec review

## Goal

Learn the neck in boxes. On the Fretboard card, a **Shapes** switch narrows
the dots to the scale's positions you pick: the 7 major-scale positions
(fretjam's, https://www.fretjam.com/major-scale-positions.html), or the 5
pentatonic boxes. You can isolate one position or combine several (e.g. 1 and
2) to see how they join.

## What the user sees

- A narrow column at the **left of the neck**: a **Shapes** switch, then an
  **All** chip and one chip per position (1–7, or 1–5 for pentatonics),
  stacked.
- Shapes off: the fretboard is exactly as today.
- Shapes on: only cells inside the **enabled positions** get dots. Root /
  Scale / Selected note / Intervals keep working inside them (colors, labels,
  clicks, Play notes unchanged).
- Each position chip toggles on/off. **All** turns every position on, and
  shows pressed when all are on. Turning the last one off leaves the board
  empty (that's allowed).
- First time Shapes is turned on, only position 1 is on.
- The column is hidden in Piano view.

### Which scales have shapes

| Scale | Positions | Numbering |
|---|---|---|
| Major (Ionian), Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian | 7 | The mode's own: position 1 is the box with the mode's root on the low E string |
| Minor Pentatonic, Major Pentatonic | 5 | Same rule: position 1 has the scale's root on the low E string |
| Anything else (Chromatic, Harmonic Minor, Phrygian Dominant) | none | Shapes switch disabled: "No shapes for this scale yet" |

Modes are derived, not stored: a mode's position *k* is its parent major's
position `((k − 1 + m) mod 7) + 1`, where *m* is the mode's index (Ionian 0,
Dorian 1 … Locrian 6), using the parent major's root. E.g. D Dorian position
1 = C major position 2.

Pentatonics likewise: store the 5 minor-pentatonic boxes; Major Pentatonic
uses its relative minor (root + 9 semitones) with *m* = 1, so its position 1
is the minor pentatonic's box 2.

### Tunings

Shapes work in any **6-string tuning with standard spacing** (string-to-string
intervals 5, 5, 5, 4, 5 semitones, low to high), at any overall pitch — E
standard, half a step down, a whole step down, three whole steps down, etc.
Boxes are placed from the actual low-string pitch, so they move to the right
frets. Any other tuning (Drop D, DADGAD, open tunings, 7-string): switch
disabled with "Shapes need standard tuning (any pitch)".

When the switch is disabled, the saved on/off and positions are kept (not
cleared); the board just shows the full scale until shapes apply again.

## Shape data

Each position is stored per string (low E → high E) as **fret offsets from
the parent root's fret on the low E string**. Transcribed from fretjam's F♯
major diagrams (root F♯ at fret 2):

| Pos | E (6) | A (5) | D (4) | G (3) | B (2) | e (1) |
|---|---|---|---|---|---|---|
| 1 | 0, 2 | −1, 0, 2 | −1, 1, 2 | −1, 1, 2 | 0, 2 | −1, 0, 2 |
| 2 | 2, 4, 5 | 2, 4 | 1, 2, 4 | 1, 2, 4 | 2, 4, 5 | 2, 4, 5 |
| 3 | 4, 5, 7 | 4, 6, 7 | 4, 6, 7 | 4, 6 | 4, 5, 7 | 4, 5, 7 |
| 4 | 5, 7 | 4, 6, 7 | 4, 6, 7 | 4, 6 | 4, 5, 7 | 4, 5, 7 |
| 5 | 7, 9 | 6, 7, 9 | 6, 7, 9 | 6, 8, 9 | 7, 9, 10 | 7, 9 |
| 6 | 9, 11, 12 | 9, 11, 12 | 9, 11 | 8, 9, 11 | 9, 10, 12 | 9, 11, 12 |
| 7 | 11, 12, 14 | 11, 12, 14 | 11, 13, 14 | 11, 13, 14 | 12, 14 | 11, 12, 14 |

(Positions 3 and 4 differ only on the low E string — fretjam labels them
"3rd/4th Pos." on its overview.)

Minor pentatonic boxes (offsets from the minor root on the low E string; the
standard boxes, e.g. A minor box 1 at fret 5):

| Box | E | A | D | G | B | e |
|---|---|---|---|---|---|---|
| 1 | 0, 3 | 0, 2 | 0, 2 | 0, 2 | 0, 3 | 0, 3 |
| 2 | 3, 5 | 2, 5 | 2, 5 | 2, 4 | 3, 5 | 3, 5 |
| 3 | 5, 7 | 5, 7 | 5, 7 | 4, 7 | 5, 8 | 5, 7 |
| 4 | 7, 10 | 7, 10 | 7, 9 | 7, 9 | 8, 10 | 7, 10 |
| 5 | 10, 12 | 10, 12 | 9, 12 | 9, 12 | 10, 12 | 10, 12 |

### Placing a position on the neck

1. Base fret *b* = (parent root pitch − low-string pitch) mod 12 (0–11).
2. For each octave shift *o* in …, −12, 0, 12, 24 …: cell (string, *b* + *o* +
   offset) for every offset.
3. Keep cells with 0 ≤ fret ≤ the board's fret count; drop the rest (a box
   past the nut or the last fret shows partially). Include every shift that
   leaves at least one cell on the board.

## Architecture

### `src/data/scalePositions.ts` (new, pure, no React)

- `positionCount(scale): number` — 7, 5 or 0.
- `shapesAvailable(tuning: string[]): boolean` — 6 strings, standard spacing.
- `positionCells({ root, scale, tuning, frets, positions }): Set<string>` —
  the `posKey(string, fret)` of every cell in the enabled positions (string
  index in the app's tuning order). Empty if unavailable.
- Internally: the two shape tables, the mode → (parent root, *m*) mapping, and
  the placement rule above.

### Fretboard card

- `useFretboardPrefs`: add `shapes: boolean` (default false) and
  `positions: number[]` (default `[1]`), saved like the other card prefs.
- `buildDots` (`DotInput`): optional `only?: Set<string>`; when set, a cell is
  drawn only if its key is in it.
- `positionRegion(same input): Set<string>` — every fret from each box's
  lowest to highest note on each string. Its scale tones are exactly
  `positionCells`; the frets between let a selected note or chord tone outside
  the key still show inside a box.
- `FretboardFace`: compute `only` with `positionRegion` when Shapes is on and
  applicable (positions above `positionCount` ignored); render the left column
  (`ShapesColumn`, new small component in the card folder) beside the neck.
  Uses existing `Switch` and `ChipButton`.

## Testing

`scalePositions.test.ts`:
- Every stored offset is a scale tone (major tables in F♯/C, pentatonic in A
  minor) — catches transcription slips.
- F♯ major position 1–7 cells match fretjam's diagrams (frets above).
- D Dorian position 1 = C major position 2; A Aeolian position 1 = C major 6.
- A Major Pentatonic position 1 = F♯ minor pentatonic box 2.
- Half step down (E♭ standard): every cell sounds the same pitch as in E
  standard, one fret higher (e.g. F♯ major position 1's low root moves from
  fret 2 to fret 3).
- Drop D, DADGAD, 7-string → `shapesAvailable` false.
- Clipping at fret 0 and at the last fret; a second instance at +12 on a
  24-fret board.

`Fretboard.test.tsx`:
- Shapes switch shows/hides the column; chips toggle positions and the dots
  follow; All turns all on and reads pressed; prefs persist.
- Disabled (with reason) for Harmonic Minor and for Drop D.
- Column hidden in Piano view.

## Out of scope (for now)

- Drawing how positions connect (outlines/colors per box).
- Shapes in non-standard tunings, 7-string, harmonic minor or other scales.
- Fingering numbers.
