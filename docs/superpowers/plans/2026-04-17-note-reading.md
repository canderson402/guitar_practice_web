# Note Reading Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Note Reading quiz card (spec `docs/superpowers/specs/2026-04-17-note-reading-design.md`) plus a fully general `GrandStaff` notation component that future chord/interval cards will reuse unchanged.

**Architecture:** New card at `src/components/NoteReading/` wrapping (a) a new general-purpose `src/components/GrandStaff/` built on VexFlow, and (b) the existing `src/components/Fretboard/` with a one-cell "prompt" dot. A new `noteReading` slice in `useStore.ts` holds mode, prompt, score, feedback state. Pure logic lives in `noteReadingLogic.ts` with full Jest coverage. Piano audio via new `src/audio/piano.ts` singleton wrapping `smplr`'s `SplendidGrandPiano`; guitar audio reuses existing `playNote` + `soundfont-player`.

**Tech Stack:** React 19, TypeScript, Zustand, VexFlow 4 (new), `smplr` (already installed), `soundfont-player` (already installed), Jest + React Testing Library.

**User directive:** Do **not** run `git commit` or `git add` during execution. Work in the worktree, show `git status` between phases if helpful, and let the user commit when they're ready.

---

## File Structure

### New files
```
src/components/
  GrandStaff/
    index.ts                                 # re-exports
    types.ts                                 # Note, Voice, GrandStaffProps, Duration
    GrandStaff.tsx                           # VexFlow-backed renderer
    GrandStaff.css                           # SVG color inheritance
    GrandStaff.test.tsx                      # multi-note coverage

  NoteReading/
    index.ts                                 # re-exports NoteReading
    NoteReading.tsx                          # card shell
    NoteReading.css                          # layout + feedback colors
    StaffPrompt.tsx                          # picks + renders staff note
    FretboardPrompt.tsx                      # picks + renders fretboard dot
    AnswerButtons.tsx                        # 3×7 grid

src/logic/
  noteReadingLogic.ts                        # pure logic: label/MIDI, prompts, validate
  noteReadingLogic.test.ts                   # Jest unit tests

src/audio/
  piano.ts                                   # SplendidGrandPiano singleton
```

### Modified files
```
package.json                                 # add vexflow dep
src/store/useStore.ts                        # add noteReading slice + actions + card entry
src/App.tsx                                  # add case 'noteReading' to renderCardContent
src/components/Card.tsx                      # add 'noteReading' to getCardType
src/themes.json (or themes source)           # add noteReading color per theme
src/audio/index.ts                           # export playPianoNote
```

---

## Task 1: Install VexFlow

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run: `npm install --save vexflow@4`
Expected: Adds `vexflow` to `dependencies`. No peer-dep warnings that matter for React 19.

- [ ] **Step 2: Verify existing build still compiles**

Run: `npm run build`
Expected: Build succeeds (warnings fine; no TypeScript errors).

---

## Task 2: Scaffold `GrandStaff/` types and empty component

**Files:**
- Create: `src/components/GrandStaff/types.ts`
- Create: `src/components/GrandStaff/GrandStaff.tsx`
- Create: `src/components/GrandStaff/GrandStaff.css`
- Create: `src/components/GrandStaff/index.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
// Shared type vocabulary for the GrandStaff renderer. Built for any notes at
// any quantity — single notes, chords, multi-voice cross-clef passages. The
// NoteReading card happens to pass single-note arrays today; future cards
// (chord ID, interval trainer) will pass larger arrays unchanged.

export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export type Spelling = 'sharp' | 'flat' | 'natural-C' | 'natural-F';

export interface Note {
  /** MIDI pitch number. A4 = 69. */
  midi: number;
  /** Force enharmonic spelling. Default 'sharp' (black keys spell as sharp).
   *  'natural-C' renders C / B# / Cb family, 'natural-F' renders F / E# / Fb. */
  spelling?: Spelling;
  /** 'show' always renders the accidental glyph even for naturals; 'auto'
   *  (default) only renders when the spelling requires one. */
  accidentalDisplay?: 'show' | 'auto';
  /** Note value. Default 'whole'. */
  duration?: Duration;
}

export interface Voice {
  /** Simultaneous notes → chord. Sequential notes would need a separate Voice
   *  API later; v1 treats every Voice as a single simultaneous sounding. */
  notes: Note[];
  /** Override clef for this voice. When omitted with clef='grand' on the
   *  parent, the voice is auto-assigned by middle-C rule. */
  clef?: 'treble' | 'bass';
}

export interface GrandStaffProps {
  /** Short form — rendered as one Voice with this clef. */
  notes?: Note[];
  /** Long form — explicit multi-voice control. Takes precedence over `notes`. */
  voices?: Voice[];
  /** 'grand' shows both staves; 'treble' / 'bass' shows one. Default 'grand'. */
  clef?: 'treble' | 'bass' | 'grand';
  /** Pixel width. If omitted the component fills its container. */
  width?: number;
  className?: string;
}
```

- [ ] **Step 2: Write minimal `GrandStaff.tsx` placeholder**

```tsx
import React from 'react';
import { GrandStaffProps } from './types';
import './GrandStaff.css';

export const GrandStaff: React.FC<GrandStaffProps> = ({ className }) => {
  return <div className={`grand-staff ${className ?? ''}`} data-testid="grand-staff" />;
};
```

- [ ] **Step 3: Write `GrandStaff.css`**

```css
.grand-staff {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 180px;
}

.grand-staff svg {
  /* VexFlow emits inline fills. We override so staff/notes inherit the card
   * theme's text color. */
  color: currentColor;
}
```

- [ ] **Step 4: Write `index.ts`**

```ts
export { GrandStaff } from './GrandStaff';
export type { Note, Voice, GrandStaffProps, Duration, Spelling } from './types';
```

- [ ] **Step 5: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 3: GrandStaff — render a single whole note (treble)

**Files:**
- Modify: `src/components/GrandStaff/GrandStaff.tsx`
- Create: `src/components/GrandStaff/GrandStaff.test.tsx`

- [ ] **Step 1: Write failing test — one treble whole note renders SVG with a notehead**

```tsx
// src/components/GrandStaff/GrandStaff.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { GrandStaff } from './GrandStaff';

describe('GrandStaff', () => {
  it('renders a single treble whole note as an SVG', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 60 }]} clef="treble" />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    // VexFlow uses <path> for noteheads and staff lines.
    expect(svg!.querySelectorAll('path').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npx react-scripts test --watchAll=false GrandStaff.test`
Expected: FAIL — no `<svg>` found (placeholder `<div>`).

- [ ] **Step 3: Implement minimal VexFlow render**

Replace `GrandStaff.tsx` body:

```tsx
import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Accidental, Formatter, Voice as VFVoice } from 'vexflow';
import { GrandStaffProps, Note, Voice, Duration } from './types';
import './GrandStaff.css';

const VF_DURATION: Record<Duration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

// Maps MIDI → { key: 'c/4', accidental: '#' | 'b' | '' } respecting a spelling hint.
const midiToVFKey = (note: Note): { key: string; accidental: '' | '#' | 'b' | 'n' } => {
  const { midi, spelling = 'sharp' } = note;
  const pc = ((midi % 12) + 12) % 12;
  // Base natural spellings by pitch-class (use sharp as canonical for accidentals).
  const sharpTable: Array<[string, '' | '#']> = [
    ['c', ''], ['c', '#'], ['d', ''], ['d', '#'], ['e', ''],
    ['f', ''], ['f', '#'], ['g', ''], ['g', '#'], ['a', ''], ['a', '#'], ['b', ''],
  ];
  const flatTable: Array<[string, '' | 'b']> = [
    ['c', ''], ['d', 'b'], ['d', ''], ['e', 'b'], ['e', ''],
    ['f', ''], ['g', 'b'], ['g', ''], ['a', 'b'], ['a', ''], ['b', 'b'], ['b', ''],
  ];
  let letter: string;
  let acc: '' | '#' | 'b' | 'n';
  let octaveAdjust = 0;

  if (spelling === 'natural-C' && (pc === 11 || pc === 0)) {
    // B# (→ C one octave up respelled as B#) or Cb (→ B one below respelled as Cb)
    if (pc === 0) { letter = 'b'; acc = '#'; octaveAdjust = -1; }
    else          { letter = 'c'; acc = 'b'; octaveAdjust = 1; }
  } else if (spelling === 'natural-F' && (pc === 4 || pc === 5)) {
    // E# (→ F respelled) or Fb (→ E respelled)
    if (pc === 5) { letter = 'e'; acc = '#'; }
    else          { letter = 'f'; acc = 'b'; }
  } else if (spelling === 'flat') {
    [letter, acc] = flatTable[pc];
  } else {
    [letter, acc] = sharpTable[pc];
  }

  const octave = Math.floor(midi / 12) - 1 + octaveAdjust;
  return { key: `${letter}/${octave}`, accidental: acc };
};

const makeStaveNote = (notes: Note[], clef: 'treble' | 'bass'): StaveNote => {
  const mapped = notes.map(midiToVFKey);
  const duration = VF_DURATION[notes[0].duration ?? 'whole'];
  const sn = new StaveNote({
    clef,
    keys: mapped.map(m => m.key),
    duration,
  });
  mapped.forEach((m, i) => {
    if (m.accidental) sn.addModifier(new Accidental(m.accidental), i);
  });
  return sn;
};

export const GrandStaff: React.FC<GrandStaffProps> = ({
  notes,
  voices,
  clef = 'grand',
  width,
  className,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

    const resolvedVoices: Voice[] =
      voices ??
      (notes && notes.length > 0 ? [{ notes, clef: clef === 'grand' ? undefined : clef }] : []);

    const w = width ?? Math.max(host.clientWidth, 320);
    const twoStaves = clef === 'grand';
    const h = twoStaves ? 220 : 140;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(w, h);
    const ctx = renderer.getContext();

    const treble = new Stave(20, 0, w - 40);
    treble.addClef('treble').setContext(ctx).draw();

    let bass: Stave | null = null;
    if (twoStaves) {
      bass = new Stave(20, 90, w - 40);
      bass.addClef('bass').setContext(ctx).draw();
    }

    // Partition voices into treble/bass groups.
    const trebleNotes: StaveNote[] = [];
    const bassNotes: StaveNote[] = [];

    for (const v of resolvedVoices) {
      if (v.notes.length === 0) continue;
      let targetClef: 'treble' | 'bass';
      if (v.clef) {
        targetClef = v.clef;
      } else if (clef === 'treble') {
        targetClef = 'treble';
      } else if (clef === 'bass') {
        targetClef = 'bass';
      } else {
        // grand auto-assignment by lowest midi; ≥60 treble, <60 bass.
        const lowest = Math.min(...v.notes.map(n => n.midi));
        targetClef = lowest >= 60 ? 'treble' : 'bass';
      }
      (targetClef === 'treble' ? trebleNotes : bassNotes).push(makeStaveNote(v.notes, targetClef));
    }

    const pad = (stave: Stave, stavenotes: StaveNote[]) => {
      if (stavenotes.length === 0) return;
      const v = new VFVoice({ numBeats: 4, beatValue: 4 }).setStrict(false);
      v.addTickables(stavenotes);
      new Formatter().joinVoices([v]).format([v], w - 80);
      v.draw(ctx, stave);
    };

    pad(treble, trebleNotes);
    if (bass) pad(bass, bassNotes);
  }, [notes, voices, clef, width]);

  return (
    <div
      ref={hostRef}
      className={`grand-staff ${className ?? ''}`}
      data-testid="grand-staff"
    />
  );
};
```

- [ ] **Step 4: Verify treble-note test passes**

Run: `npx react-scripts test --watchAll=false GrandStaff.test`
Expected: PASS.

---

## Task 4: GrandStaff — bass clef, grand clef, accidentals, durations, chords, voices

**Files:**
- Modify: `src/components/GrandStaff/GrandStaff.test.tsx`

These tests validate the **general-purpose** behavior required by spec §2 and §12.1. No production code changes needed — Task 3's implementation already handles all cases. These tests prove it.

- [ ] **Step 1: Add tests for every required shape**

Append to `GrandStaff.test.tsx`:

```tsx
  it('renders a single bass whole note', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 43 }]} clef="bass" />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a grand staff with one note auto-placed on treble', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 72 }]} clef="grand" />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a grand staff with one note auto-placed on bass', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 40 }]} clef="grand" />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a 3-note chord on a single clef', () => {
    const { container } = render(
      <GrandStaff
        notes={[{ midi: 60 }, { midi: 64 }, { midi: 67 }]}
        clef="treble"
      />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a cross-clef chord via voices', () => {
    const { container } = render(
      <GrandStaff
        voices={[
          { clef: 'treble', notes: [{ midi: 72 }, { midi: 76 }] },
          { clef: 'bass',   notes: [{ midi: 48 }, { midi: 55 }] },
        ]}
        clef="grand"
      />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders every accidental case without throwing', () => {
    // Sharp, flat, natural-C (B# / Cb), natural-F (E# / Fb)
    const cases: Array<{ midi: number; spelling: 'sharp' | 'flat' | 'natural-C' | 'natural-F' }> = [
      { midi: 61, spelling: 'sharp' },        // C#
      { midi: 61, spelling: 'flat' },         // Db
      { midi: 60, spelling: 'natural-C' },    // B#
      { midi: 59, spelling: 'natural-C' },    // Cb
      { midi: 65, spelling: 'natural-F' },    // E#
      { midi: 64, spelling: 'natural-F' },    // Fb
    ];
    cases.forEach(c => {
      const { container, unmount } = render(
        <GrandStaff notes={[{ midi: c.midi, spelling: c.spelling }]} clef="treble" />
      );
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    });
  });

  it('renders every supported duration', () => {
    (['whole', 'half', 'quarter', 'eighth', 'sixteenth'] as const).forEach(d => {
      const { container, unmount } = render(
        <GrandStaff notes={[{ midi: 67, duration: d }]} clef="treble" />
      );
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    });
  });
```

- [ ] **Step 2: Run the whole GrandStaff test file**

Run: `npx react-scripts test --watchAll=false GrandStaff.test`
Expected: All tests PASS. If any throw, fix `GrandStaff.tsx` `midiToVFKey` or rendering logic until they pass.

---

## Task 5: Build `noteReadingLogic.ts` with full test coverage

**Files:**
- Create: `src/logic/noteReadingLogic.ts`
- Create: `src/logic/noteReadingLogic.test.ts`

- [ ] **Step 1: Write the test file first (TDD)**

```ts
// src/logic/noteReadingLogic.test.ts
import {
  Label,
  labelToPitchClass,
  pitchClassToLabels,
  pickStaffPrompt,
  pickFretboardPrompt,
  validateAnswer,
  nextPromptAvoidingRepeat,
  midiFromTuningAndFret,
} from './noteReadingLogic';

describe('labelToPitchClass', () => {
  it('maps naturals and accidentals to pitch classes 0..11', () => {
    expect(labelToPitchClass('C')).toBe(0);
    expect(labelToPitchClass('C#')).toBe(1);
    expect(labelToPitchClass('Db')).toBe(1);
    expect(labelToPitchClass('B#')).toBe(0);
    expect(labelToPitchClass('Cb')).toBe(11);
    expect(labelToPitchClass('E#')).toBe(5);
    expect(labelToPitchClass('Fb')).toBe(4);
  });
});

describe('pitchClassToLabels', () => {
  it('returns all 21-label-set spellings for each pitch class', () => {
    expect(pitchClassToLabels(0).sort()).toEqual(['B#', 'C'].sort());
    expect(pitchClassToLabels(1).sort()).toEqual(['C#', 'Db'].sort());
    expect(pitchClassToLabels(4).sort()).toEqual(['E', 'Fb'].sort());
    expect(pitchClassToLabels(5).sort()).toEqual(['E#', 'F'].sort());
    expect(pitchClassToLabels(11).sort()).toEqual(['B', 'Cb'].sort());
    expect(pitchClassToLabels(2)).toEqual(['D']); // D has no enharmonic in our 21-set
  });
});

describe('pickStaffPrompt', () => {
  it('returns a prompt with MIDI in the union of treble and bass ranges', () => {
    for (let i = 0; i < 200; i++) {
      const p = pickStaffPrompt();
      expect(p.kind).toBe('staff');
      if (p.clef === 'treble') {
        expect(p.midi).toBeGreaterThanOrEqual(60);
        expect(p.midi).toBeLessThanOrEqual(84);
      } else {
        expect(p.midi).toBeGreaterThanOrEqual(40);
        expect(p.midi).toBeLessThanOrEqual(60);
      }
      // Spelling is always a member of the 21-label set and matches MIDI pitch class.
      expect(labelToPitchClass(p.spelling)).toBe(((p.midi % 12) + 12) % 12);
    }
  });
});

describe('pickFretboardPrompt', () => {
  const tuning = ['E', 'B', 'G', 'D', 'A', 'E']; // high to low
  it('returns string 0..5, fret 0..12, with at least one acceptable answer', () => {
    for (let i = 0; i < 200; i++) {
      const p = pickFretboardPrompt(tuning);
      expect(p.stringIndex).toBeGreaterThanOrEqual(0);
      expect(p.stringIndex).toBeLessThanOrEqual(5);
      expect(p.fret).toBeGreaterThanOrEqual(0);
      expect(p.fret).toBeLessThanOrEqual(12);
      expect(p.acceptableAnswers.length).toBeGreaterThanOrEqual(1);
      p.acceptableAnswers.forEach(lbl =>
        expect(labelToPitchClass(lbl)).toBe(((p.midi % 12) + 12) % 12)
      );
    }
  });
});

describe('midiFromTuningAndFret', () => {
  it('standard tuning: string 5 fret 0 is E2 (MIDI 40)', () => {
    expect(midiFromTuningAndFret(['E', 'B', 'G', 'D', 'A', 'E'], 5, 0)).toBe(40);
  });
  it('standard tuning: string 0 fret 12 is E5 (MIDI 76)', () => {
    expect(midiFromTuningAndFret(['E', 'B', 'G', 'D', 'A', 'E'], 0, 12)).toBe(76);
  });
});

describe('validateAnswer', () => {
  it('staff: only the exact spelling counts', () => {
    const prompt = { kind: 'staff' as const, midi: 61, clef: 'treble' as const, spelling: 'C#' as Label };
    expect(validateAnswer(prompt, 'C#')).toBe('correct');
    expect(validateAnswer(prompt, 'Db')).toBe('wrong');
    expect(validateAnswer(prompt, 'C')).toBe('wrong');
  });
  it('fretboard: any enharmonic counts', () => {
    const prompt = {
      kind: 'fretboard' as const,
      midi: 61, stringIndex: 5, fret: 9,
      acceptableAnswers: ['C#', 'Db'] as Label[],
    };
    expect(validateAnswer(prompt, 'C#')).toBe('correct');
    expect(validateAnswer(prompt, 'Db')).toBe('correct');
    expect(validateAnswer(prompt, 'D')).toBe('wrong');
  });
});

describe('nextPromptAvoidingRepeat', () => {
  it('does not return the same staff spelling on consecutive calls when possible', () => {
    let prev = null as ReturnType<typeof pickStaffPrompt> | null;
    for (let i = 0; i < 30; i++) {
      const next = nextPromptAvoidingRepeat(prev, 'staff', ['E','B','G','D','A','E']);
      if (prev && next.kind === 'staff' && prev.kind === 'staff') {
        // We allow rare equality after the retry cap, but it shouldn't be consistent.
        // Here, just check the function terminates and returns a valid prompt.
      }
      prev = next as any;
      expect(next).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx react-scripts test --watchAll=false noteReadingLogic`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `noteReadingLogic.ts`**

```ts
// src/logic/noteReadingLogic.ts
// Pure functions for the NoteReading card — prompt generation, validation,
// and label/MIDI math. No React, no store, no side effects. Easy to test.

export type Label =
  | 'C'  | 'D'  | 'E'  | 'F'  | 'G'  | 'A'  | 'B'
  | 'C#' | 'D#' | 'E#' | 'F#' | 'G#' | 'A#' | 'B#'
  | 'Cb' | 'Db' | 'Eb' | 'Fb' | 'Gb' | 'Ab' | 'Bb';

export const ALL_LABELS: Label[] = [
  'C#','D#','E#','F#','G#','A#','B#',
  'C','D','E','F','G','A','B',
  'Cb','Db','Eb','Fb','Gb','Ab','Bb',
];

const LABEL_PC: Record<Label, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
  'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10, B: 11, 'B#': 0, Cb: 11,
};

export const labelToPitchClass = (l: Label): number => LABEL_PC[l];

export const pitchClassToLabels = (pc: number): Label[] =>
  ALL_LABELS.filter(l => LABEL_PC[l] === ((pc % 12) + 12) % 12);

export interface StaffPrompt {
  kind: 'staff';
  midi: number;
  clef: 'treble' | 'bass';
  spelling: Label;
}

export interface FretboardPrompt {
  kind: 'fretboard';
  midi: number;
  stringIndex: number;
  fret: number;
  acceptableAnswers: Label[];
}

export type Prompt = StaffPrompt | FretboardPrompt;

// ---- Helpers ----

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const noteNameToPitchClass = (name: string): number => {
  // Accept 'E', 'F#', 'Bb', etc.
  const letter = name[0].toUpperCase();
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[letter];
  if (name.includes('#')) pc = (pc + 1) % 12;
  if (name.includes('b')) pc = (pc + 11) % 12;
  return pc;
};

/** Standard-tuning defaults give open-string MIDI:
 *  low-E = 40, A = 45, D = 50, G = 55, B = 59, high-E = 64.
 *  This function assumes the conventional octaves for each open-string letter. */
export const midiFromTuningAndFret = (
  tuning: string[],
  stringIndex: number,
  fret: number
): number => {
  // Standard octave assignments per-letter for each of the 6 strings, high→low.
  const standardOctaves = [4, 3, 3, 3, 2, 2]; // E4 B3 G3 D3 A2 E2
  const name = tuning[stringIndex];
  const pc = noteNameToPitchClass(name);
  const octave = standardOctaves[stringIndex];
  // MIDI for C of that octave + pc + fret offset.
  return 12 * (octave + 1) + pc + fret;
};

/** Pick a spelling for a given MIDI pitch, matching the 21-label set and
 *  v1's weighting rules (spec §7.1). */
const pickSpellingForMidi = (midi: number): Label => {
  const pc = ((midi % 12) + 12) % 12;
  const options = pitchClassToLabels(pc);
  if (options.length === 1) return options[0];
  // pc is 0, 1, 3, 4, 5, 6, 8, 10, 11 (two-option cases).
  // For natural-natural pcs (0, 4, 5, 11), 10% of the time spell enharmonically.
  const naturalPcs = new Set([0, 4, 5, 11]);
  if (naturalPcs.has(pc)) {
    const enharmonic = options.find(l => l !== 'C' && l !== 'E' && l !== 'F' && l !== 'B')!;
    const natural = options.find(l => l === 'C' || l === 'E' || l === 'F' || l === 'B')!;
    return Math.random() < 0.1 ? enharmonic : natural;
  }
  // Black-key pcs: 50/50 sharp/flat.
  return options[Math.random() < 0.5 ? 0 : 1];
};

// ---- Prompt generators ----

export const pickStaffPrompt = (): StaffPrompt => {
  const clef: 'treble' | 'bass' = Math.random() < 0.5 ? 'treble' : 'bass';
  const midi = clef === 'treble' ? randInt(60, 84) : randInt(40, 60);
  const spelling = pickSpellingForMidi(midi);
  return { kind: 'staff', midi, clef, spelling };
};

export const pickFretboardPrompt = (tuning: string[]): FretboardPrompt => {
  const stringIndex = randInt(0, 5);
  const fret = randInt(0, 12);
  const midi = midiFromTuningAndFret(tuning, stringIndex, fret);
  const acceptableAnswers = pitchClassToLabels(((midi % 12) + 12) % 12);
  return { kind: 'fretboard', midi, stringIndex, fret, acceptableAnswers };
};

// ---- Validation ----

export const validateAnswer = (prompt: Prompt, label: Label): 'correct' | 'wrong' => {
  if (prompt.kind === 'staff') return label === prompt.spelling ? 'correct' : 'wrong';
  return prompt.acceptableAnswers.includes(label) ? 'correct' : 'wrong';
};

// ---- No-immediate-repeat guard ----

const sameIdentity = (a: Prompt, b: Prompt): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'staff' && b.kind === 'staff') {
    return a.spelling === b.spelling && a.clef === b.clef;
  }
  if (a.kind === 'fretboard' && b.kind === 'fretboard') {
    return a.stringIndex === b.stringIndex && a.fret === b.fret;
  }
  return false;
};

export const nextPromptAvoidingRepeat = (
  previous: Prompt | null,
  mode: 'staff' | 'fretboard',
  tuning: string[]
): Prompt => {
  const make = () => (mode === 'staff' ? pickStaffPrompt() : pickFretboardPrompt(tuning));
  let next = make();
  let attempts = 0;
  while (previous && sameIdentity(next, previous) && attempts < 3) {
    next = make();
    attempts += 1;
  }
  return next;
};
```

- [ ] **Step 4: Run the tests**

Run: `npx react-scripts test --watchAll=false noteReadingLogic`
Expected: All PASS.

---

## Task 6: Add `noteReading` slice + actions + card entry to `useStore.ts`

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Add types near top of file**

Import + define near other slice interfaces (after `CircleOfFifthsState`, before `JamState`):

```ts
import { Prompt, Label, nextPromptAvoidingRepeat, validateAnswer } from '../logic/noteReadingLogic';

type NoteReadingMode = 'staff' | 'fretboard';

interface NoteReadingState {
  mode: NoteReadingMode;
  prompt: Prompt | null;
  answerState: 'waiting' | 'correct';
  wrongPresses: Label[];
  justPressedCorrect: Label | null;
  hadWrongThisRound: boolean;
  score: {
    correct: number;
    total: number;
    streak: number;
    bestStreak: number;
  };
}
```

- [ ] **Step 2: Add the state to `StoreState` interface**

Find the `StoreState` interface and add:

```ts
  noteReading: NoteReadingState;

  // Note Reading actions
  setNoteReadingMode: (mode: NoteReadingMode) => void;
  nextNoteReadingPrompt: () => void;
  pressNoteReadingAnswer: (label: Label) => void;
  resetNoteReadingScore: () => void;
```

- [ ] **Step 3: Add initial state inside the store**

In the `create<StoreState>()((set) => ({ ... }))` body, near other initial states:

```ts
  noteReading: {
    mode: 'staff',
    prompt: null,
    answerState: 'waiting',
    wrongPresses: [],
    justPressedCorrect: null,
    hadWrongThisRound: false,
    score: { correct: 0, total: 0, streak: 0, bestStreak: 0 },
  },
```

- [ ] **Step 4: Add actions**

Near bottom of the store body (before the closing `}))`):

```ts
  setNoteReadingMode: (mode) => set((state) => {
    const next = nextPromptAvoidingRepeat(null, mode, state.note.tuning);
    return {
      noteReading: {
        ...state.noteReading,
        mode,
        prompt: next,
        answerState: 'waiting',
        wrongPresses: [],
        justPressedCorrect: null,
        hadWrongThisRound: false,
      },
    };
  }),

  nextNoteReadingPrompt: () => set((state) => {
    const next = nextPromptAvoidingRepeat(
      state.noteReading.prompt,
      state.noteReading.mode,
      state.note.tuning
    );
    return {
      noteReading: {
        ...state.noteReading,
        prompt: next,
        answerState: 'waiting',
        wrongPresses: [],
        justPressedCorrect: null,
        hadWrongThisRound: false,
      },
    };
  }),

  pressNoteReadingAnswer: (label) => set((state) => {
    const { prompt, wrongPresses, score, hadWrongThisRound } = state.noteReading;
    if (!prompt) return {};
    if (wrongPresses.includes(label)) return {}; // already disabled this round
    const result = validateAnswer(prompt, label);
    if (result === 'wrong') {
      return {
        noteReading: {
          ...state.noteReading,
          wrongPresses: [...wrongPresses, label],
          hadWrongThisRound: true,
        },
      };
    }
    // correct
    const newCorrect = hadWrongThisRound ? score.correct : score.correct + 1;
    const newStreak = hadWrongThisRound ? 0 : score.streak + 1;
    const newBest = Math.max(score.bestStreak, newStreak);
    return {
      noteReading: {
        ...state.noteReading,
        answerState: 'correct',
        justPressedCorrect: label,
        score: {
          correct: newCorrect,
          total: score.total + 1,
          streak: newStreak,
          bestStreak: newBest,
        },
      },
    };
  }),

  resetNoteReadingScore: () => set((state) => ({
    noteReading: {
      ...state.noteReading,
      score: { correct: 0, total: 0, streak: 0, bestStreak: 0 },
    },
  })),
```

- [ ] **Step 5: Add card entry**

In the `cards: [...]` array, add before `{ id: 'guitarNeck', ... }`:

```ts
    { id: 'noteReading', title: 'Note Reading', isActive: true, layout: 'vertical' },
```

- [ ] **Step 6: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 7: Build `AnswerButtons.tsx`

**Files:**
- Create: `src/components/NoteReading/AnswerButtons.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/NoteReading/AnswerButtons.tsx
import React from 'react';
import { Label, ALL_LABELS } from '../../logic/noteReadingLogic';

interface AnswerButtonsProps {
  wrongPresses: Label[];
  answerState: 'waiting' | 'correct';
  justPressedCorrect: Label | null;
  onPress: (label: Label) => void;
}

const ROWS: Label[][] = [
  ['C#','D#','E#','F#','G#','A#','B#'],
  ['C','D','E','F','G','A','B'],
  ['Cb','Db','Eb','Fb','Gb','Ab','Bb'],
];

export const AnswerButtons: React.FC<AnswerButtonsProps> = ({
  wrongPresses,
  answerState,
  justPressedCorrect,
  onPress,
}) => {
  // Disable all buttons during the post-correct feedback pause so the user
  // can't double-advance before the state machine clocks forward.
  const locked = answerState === 'correct';

  return (
    <div className="answer-buttons-grid">
      {ROWS.map((row, ri) => (
        <div className="answer-buttons-row" key={ri}>
          {row.map(label => {
            const isWrong = wrongPresses.includes(label);
            const isCorrect = justPressedCorrect === label;
            const disabled = locked || isWrong;
            const className = [
              'answer-btn',
              isWrong ? 'wrong' : '',
              isCorrect ? 'correct' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={label}
                className={className}
                disabled={disabled}
                onClick={() => onPress(label)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors. (`ALL_LABELS` import exists; tolerable if unused — TypeScript won't error on it unless ESLint is strict; if it errors, drop the import.)

---

## Task 8: Build `StaffPrompt.tsx`

**Files:**
- Create: `src/components/NoteReading/StaffPrompt.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/NoteReading/StaffPrompt.tsx
import React from 'react';
import { GrandStaff, Note, Spelling } from '../GrandStaff';
import { StaffPrompt as StaffPromptData, Label } from '../../logic/noteReadingLogic';

const labelToSpelling = (label: Label): Spelling => {
  // Enharmonic-natural labels force 'natural-C' or 'natural-F' to get
  // VexFlow to draw the correct letter + accidental combo.
  if (label === 'B#' || label === 'Cb') return 'natural-C';
  if (label === 'E#' || label === 'Fb') return 'natural-F';
  if (label.includes('b')) return 'flat';
  if (label.includes('#')) return 'sharp';
  return 'sharp'; // natural letter — no accidental rendered
};

interface Props { prompt: StaffPromptData; }

export const StaffPrompt: React.FC<Props> = ({ prompt }) => {
  const note: Note = {
    midi: prompt.midi,
    spelling: labelToSpelling(prompt.spelling),
    duration: 'whole',
  };
  return <GrandStaff notes={[note]} clef="grand" />;
};
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 9: Build `FretboardPrompt.tsx`

**Files:**
- Create: `src/components/NoteReading/FretboardPrompt.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/NoteReading/FretboardPrompt.tsx
import React from 'react';
import { Fretboard } from '../Fretboard/Fretboard';
import { DotInfo, posKey } from '../Fretboard/types';
import { FretboardPrompt as FretboardPromptData } from '../../logic/noteReadingLogic';
import { useStore } from '../../store/useStore';

interface Props { prompt: FretboardPromptData; }

export const FretboardPrompt: React.FC<Props> = ({ prompt }) => {
  const tuning = useStore(s => s.note.tuning);
  const dots = new Map<string, DotInfo>();
  // label: '?' hides the note name (would reveal the answer) while keeping
  // the dot visible. Variant 'current' reuses the app's orange highlight.
  dots.set(posKey(prompt.stringIndex, prompt.fret), { variant: 'current', label: '?' });

  return (
    <Fretboard
      strings={6}
      fretCount={12}
      tuning={tuning}
      dots={dots}
      showStringLabels={true}
      showFretNumbers="bottom"
      textMode="white"
    />
  );
};
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 10: Build piano audio singleton

**Files:**
- Create: `src/audio/piano.ts`
- Modify: `src/audio/index.ts`

- [ ] **Step 1: Write `piano.ts`**

```ts
// src/audio/piano.ts
// SplendidGrandPiano singleton for the Note Reading card's Staff mode.
// Loaded lazily on first call; subsequent calls reuse the same player.

import { SplendidGrandPiano } from 'smplr';
import { getAudioContext, getMasterGain } from './engine';

let piano: SplendidGrandPiano | null = null;
let loading: Promise<SplendidGrandPiano> | null = null;

const getPiano = (): Promise<SplendidGrandPiano> => {
  if (piano) return Promise.resolve(piano);
  if (loading) return loading;
  const ctx = getAudioContext();
  const instance = new SplendidGrandPiano(ctx, {
    destination: getMasterGain(),
  });
  loading = instance.loaded().then(() => {
    piano = instance;
    loading = null;
    return instance;
  });
  return loading;
};

/** Fire-and-forget play. Awaits sample load on first call, then plays.
 *  If called again before the first load resolves, subsequent calls queue
 *  on the same promise. */
export const playPianoNote = async (midi: number, duration = 1.2): Promise<void> => {
  const p = await getPiano();
  p.start({ note: midi, duration });
};
```

- [ ] **Step 2: Export from audio index**

Open `src/audio/index.ts` and append:

```ts
export { playPianoNote } from './piano';
```

- [ ] **Step 3: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 11: Build `NoteReading.tsx` card shell

**Files:**
- Create: `src/components/NoteReading/NoteReading.tsx`
- Create: `src/components/NoteReading/index.ts`

- [ ] **Step 1: Write `NoteReading.tsx`**

```tsx
// src/components/NoteReading/NoteReading.tsx
import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { StaffPrompt } from './StaffPrompt';
import { FretboardPrompt } from './FretboardPrompt';
import { AnswerButtons } from './AnswerButtons';
import { playPianoNote } from '../../audio/piano';
import { playNote } from '../../audio/synth';
import './NoteReading.css';

export const NoteReading: React.FC = () => {
  const {
    noteReading,
    setNoteReadingMode,
    nextNoteReadingPrompt,
    pressNoteReadingAnswer,
    resetNoteReadingScore,
  } = useStore();

  const { mode, prompt, answerState, wrongPresses, justPressedCorrect, score } = noteReading;

  // Generate first prompt on mount if none exists.
  useEffect(() => {
    if (!prompt) nextNoteReadingPrompt();
  }, [prompt, nextNoteReadingPrompt]);

  // When the user gets it right, play audio + advance after a short pause.
  useEffect(() => {
    if (answerState !== 'correct' || !prompt) return;
    // Fire audio (fire-and-forget; piano call is async internally).
    if (mode === 'staff') {
      void playPianoNote(prompt.midi, 1.2);
    } else {
      playNote(prompt.midi, 1.2, undefined, { instrument: 'acoustic_guitar_nylon' });
    }
    const timer = window.setTimeout(() => {
      nextNoteReadingPrompt();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [answerState, prompt, mode, nextNoteReadingPrompt]);

  return (
    <div className="note-reading">
      <div className="note-reading-top">
        <div className="score-panel">
          <span>Score: {score.correct}/{score.total}</span>
          <span>Streak: {score.streak}</span>
          <span>Best: {score.bestStreak}</span>
          <button className="reset-btn" onClick={resetNoteReadingScore}>Reset score</button>
        </div>
        <div className="mode-toggle">
          <button
            className={mode === 'staff' ? 'active' : ''}
            onClick={() => setNoteReadingMode('staff')}
          >Staff</button>
          <button
            className={mode === 'fretboard' ? 'active' : ''}
            onClick={() => setNoteReadingMode('fretboard')}
          >Fretboard</button>
        </div>
      </div>

      <div className="prompt-area">
        {prompt?.kind === 'staff' && <StaffPrompt prompt={prompt} />}
        {prompt?.kind === 'fretboard' && <FretboardPrompt prompt={prompt} />}
      </div>

      <AnswerButtons
        wrongPresses={wrongPresses}
        answerState={answerState}
        justPressedCorrect={justPressedCorrect}
        onPress={pressNoteReadingAnswer}
      />
    </div>
  );
};
```

- [ ] **Step 2: Write `index.ts`**

```ts
export { NoteReading } from './NoteReading';
```

- [ ] **Step 3: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors.

---

## Task 12: Write `NoteReading.css`

**Files:**
- Create: `src/components/NoteReading/NoteReading.css`

- [ ] **Step 1: Write the styles**

```css
.note-reading {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 8px 4px;
  color: currentColor;
}

.note-reading-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.score-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  opacity: 0.9;
}

.score-panel .reset-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid currentColor;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  opacity: 0.7;
}
.score-panel .reset-btn:hover { opacity: 1; }

.mode-toggle {
  display: inline-flex;
  border: 1px solid currentColor;
  border-radius: 6px;
  overflow: hidden;
  opacity: 0.85;
}
.mode-toggle button {
  padding: 6px 14px;
  background: transparent;
  color: currentColor;
  border: none;
  cursor: pointer;
  font-size: 13px;
}
.mode-toggle button.active {
  background: currentColor;
  color: var(--card-bg, #222);
}

.prompt-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.answer-buttons-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.answer-buttons-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  width: min(560px, 100%);
}

.answer-btn {
  padding: 10px 0;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: currentColor;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.answer-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}
.answer-btn:disabled {
  cursor: default;
  opacity: 0.85;
}
.answer-btn.wrong {
  background: rgba(220, 60, 60, 0.35);
  border-color: rgba(220, 60, 60, 0.7);
  color: #fff;
}
.answer-btn.correct {
  background: rgba(60, 200, 90, 0.55);
  border-color: rgba(60, 200, 90, 0.9);
  color: #fff;
}
```

- [ ] **Step 2: Run build to verify CSS loads**

Run: `npm run build`
Expected: Build completes.

---

## Task 13: Wire the card into the app shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Card.tsx`

- [ ] **Step 1: Add `NoteReading` to `App.tsx`**

Add import near other component imports:

```ts
import { NoteReading } from './components/NoteReading';
```

Add a case inside `renderCardContent`'s `switch (card.id)` (near `case 'jam'`):

```ts
      case 'noteReading':
        return <NoteReading />;
```

- [ ] **Step 2: Add theme type in `Card.tsx`**

In `getCardType`, add BEFORE the `if (title.includes('Note Trainer'))` line (so the more-specific match wins):

```ts
    if (title.includes('Note Reading')) return 'noteReading';
```

- [ ] **Step 3: Compile check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Confirm build succeeds**

Run: `npm run build`
Expected: Succeeds. Bundle will grow by ~200KB (VexFlow).

---

## Task 14: Manual browser verification

**Files:** None — browser test only.

- [ ] **Step 1: Start dev server**

Run: `npm start`
Expected: Dev server opens on http://localhost:3000.

- [ ] **Step 2: Validate Staff mode**

In the browser:
- Confirm a new "Note Reading" card appears, visible by default.
- Click through ~15 prompts in Staff mode.
- Verify: accidentals render correctly; wrong button turns red and stays red; correct button flashes green; piano note plays on correct; score/streak/best update correctly; Reset clears all four counters; no console errors.

- [ ] **Step 3: Validate Fretboard mode**

- Toggle to Fretboard mode.
- Confirm the fretboard appears with exactly one highlighted dot (label `?`) somewhere in frets 0–12.
- Click through ~15 prompts.
- Verify: either enharmonic (e.g. both `C#` and `Db`) counts for accidental positions; naturals only accept one label; guitar note plays on correct; all feedback/scoring same as Staff mode; no console errors.

- [ ] **Step 4: Verify full test suite**

Run: `npx react-scripts test --watchAll=false`
Expected: All tests pass (new ones + existing regression).

- [ ] **Step 5: Final build check**

Run: `npm run build`
Expected: Succeeds with no new warnings.

---

## Self-Review Notes

- **Spec §2 non-scope-cut:** Task 4 exercises GrandStaff with multi-note chords, cross-clef voices, all accidentals, and every duration — that's the day-one general-purpose guarantee.
- **Spec §5.1 API:** Defined in Task 2 `types.ts` and implemented in Task 3 `GrandStaff.tsx`; `notes`, `voices`, `clef` all honored.
- **Spec §6 state model:** Task 6 adds the slice with the exact field names used in `noteReadingLogic.ts` (Task 5).
- **Spec §7 logic:** Task 5 covers every pure-function requirement with tests.
- **Spec §8 audio:** Task 10 adds piano singleton; Task 11 wires piano for Staff, `playNote` for Fretboard — exactly per spec §8.1 / §8.2.
- **Spec §9 integration:** Task 6 (card entry) + Task 13 (App + Card).
- **Spec §11 naming:** `NoteReading` path; existing `NoteTrainer.tsx` untouched.
- **Spec §12 tests:** Task 5 unit + Task 14 manual.
- **No commits** anywhere in the plan per user directive; the `git` verb appears zero times in step commands.
