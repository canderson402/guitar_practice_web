# Note Reading Card — Design Spec

**Date:** 2026-04-17
**Scope:** v1 of a new "Note Reading" card for the Guitar Practice app.
**Status:** Draft for review.

## 1. Purpose

Add a sight-reading quiz card modeled after musictheory.net's Note Identification exercise. The user is shown a single note on either a grand staff or a guitar fretboard, and selects the correct pitch-class label from a 3×7 button grid. On a correct answer, the note plays through a real sampled instrument.

## 2. Scope

This spec covers two exercises in a single card:

- **E3 (Staff → Name):** A whole note is drawn on a grand staff. User clicks the correct note-name button.
- **E4 (Fretboard → Name):** A dot highlights on a guitar fretboard. User clicks the correct note-name button.

Mode is selected via a segmented control in the card header (`Staff | Fretboard`). Both modes share the same answer surface, scoring, feedback logic, and audio playback.

### Explicit non-scope-cut: `GrandStaff` is built fully-functional now

The reusable `GrandStaff` component introduced by this spec is **fully functional for any number of notes of any pitch / accidental / duration across either clef**, shipped in v1. The v1 NoteReading card only passes single notes at a time, but that is a decision of the *card's prompt generator*, not a restriction of `GrandStaff`.

This is deliberate, and non-negotiable: scoping `GrandStaff` to "only one whole note" would force a rewrite for every future card that needs chords, intervals, or multi-voice notation (chord identification, interval trainer, sight-reading of progressions, etc.). By building the general component once, every future caller just passes different `notes` arrays — no structural change to the renderer is ever needed.

See §5.1 for the full API, and §12 for the multi-note tests that verify this in v1.

### Out of scope for v1

Each of the following is a future spec, not v1:

- **E1 — Note name → click a fret** (inverse of E4).
- **E2 — Note name → click a line/space on the staff** (inverse of E3).
- **E5 — "Find all Cs" multi-select drill** on the fretboard.
- **Interval Trainer** (separate card).
- **Chord identification** (separate card; uses `GrandStaff` forward-compatibility — see §10).
- **Settings UI:** clef restrictions, accidental restrictions, fret range, tuning overrides, difficulty presets. v1 uses hardcoded sensible defaults.
- **Timer / time-pressure modes.**
- **Per-clef or per-string score breakdown.**
- **Persistence across sessions.** Score resets on reload, consistent with every other card in the app today.

## 3. Terminology

- **Pitch-class label (`Label`):** one of the 21 strings in the button grid: `C D E F G A B | C# D# E# F# G# A# B# | Cb Db Eb Fb Gb Ab Bb`.
- **Spelling:** the specific `Label` that names a given MIDI pitch given a clef and context. E.g. MIDI 60 can spell as `C`, `B#`, or `Dbb`. v1 uses only the 21 labels listed above; `Dbb` and other double-accidentals are never generated.
- **Prompt:** the data describing what the user is currently being asked to name.

## 4. User experience

### 4.1 Layout (`vertical` card)

```
┌─ Note Reading ─────────────────── [ Staff | Fretboard ] ─┐
│     Score: 12/15   Streak: 5   Best: 8   [Reset score]   │
│                                                          │
│            ┌──────────────────────────────┐              │
│            │                              │              │
│            │   (Grand staff OR fretboard) │              │
│            │                              │              │
│            └──────────────────────────────┘              │
│                                                          │
│             ┌──┬──┬──┬──┬──┬──┬──┐                       │
│             │C#│D#│E#│F#│G#│A#│B#│                       │
│             ├──┼──┼──┼──┼──┼──┼──┤                       │
│             │C │D │E │F │G │A │B │                       │
│             ├──┼──┼──┼──┼──┼──┼──┤                       │
│             │Cb│Db│Eb│Fb│Gb│Ab│Bb│                       │
│             └──┴──┴──┴──┴──┴──┴──┘                       │
└──────────────────────────────────────────────────────────┘
```

- **Mode toggle:** segmented control in the card's top-right (`Staff | Fretboard`).
- **Score panel:** horizontal strip near the top. Shows `Score: correct/total`, `Streak: n`, `Best: m`, and a `[Reset score]` button.
- **Prompt area:** grand staff (Staff mode) or guitar fretboard (Fretboard mode). Centered, sized to the card width.
- **Answer grid:** 3 rows × 7 columns, horizontally centered, fixed positions. Always shows all 21 labels — row 1 sharps, row 2 naturals, row 3 flats. Matches the screenshot the user provided.

### 4.2 Interaction flow

1. Card mounts → generate the first prompt for the current mode.
2. User clicks an answer button.
3. **If correct:** button flashes green briefly, the prompted pitch plays through the appropriate instrument, score updates (`correct++`, `total++`, `streak++`, `bestStreak = max(bestStreak, streak)`), then after ~500ms the next prompt is generated.
4. **If wrong:** the clicked button turns red and becomes disabled for the rest of this round. All other buttons remain active. The user continues pressing buttons until they find the correct one. A round that took any wrong presses increments `total` but not `correct`; `streak` resets to 0.
5. **Mode change:** generates a new prompt appropriate to the new mode; score is preserved across mode changes within a session. The card does not auto-advance to the next prompt without user input.
6. **Reset score:** clears `correct`, `total`, `streak`, `bestStreak` to 0. Does not generate a new prompt.

### 4.3 Audio feedback

- Audio plays **only on correct answer**. Wrong answers are silent.
- **Staff mode:** `smplr` `SplendidGrandPiano`. Loaded lazily on first correct answer.
- **Fretboard mode:** existing `playNote(midi, 1.2, undefined, { instrument: 'acoustic_guitar_nylon' })` — reuses the `soundfont-player`/MusyngKite pipeline already in the codebase.
- In both cases the played pitch is the MIDI of the prompted note (not a neutral tone), so the user hears what they just identified.

## 5. Component architecture

```
src/components/
  NoteReading/
    index.ts
    NoteReading.tsx          # card shell: mode toggle, score, wires prompt + buttons
    NoteReading.css
    StaffPrompt.tsx          # picks a staff note, renders <GrandStaff notes={[...]}>
    FretboardPrompt.tsx      # picks a fretboard dot, renders existing <Fretboard dots={...}>
    AnswerButtons.tsx        # 3×7 grid, feedback colors, click handler
    noteReadingLogic.ts      # pure functions: pick prompts, validate answers, label helpers

  GrandStaff/
    index.ts
    GrandStaff.tsx           # reusable notation renderer (VexFlow)
    GrandStaff.css
    types.ts                 # <Note>, <GrandStaffProps>
```

Only `NoteReading/` is specific to this card. `GrandStaff/` is a reusable component designed to also serve Interval Trainer and any future card that needs music notation. `FretboardPrompt` reuses the existing `src/components/Fretboard/` component without modification.

### 5.1 GrandStaff API

`GrandStaff` is a **general-purpose** notation renderer. It is built from day one to accept **any notes in any quantity** — single notes, chords, multi-voice passages, across one or both clefs. The v1 NoteReading card happens to only pass single notes, but that is a convention of the card, not a limitation of `GrandStaff`. Nothing about the component's internals hardcodes "one whole note" — if you hand it a six-note chord spanning both clefs, it renders a six-note chord spanning both clefs.

```ts
type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

interface Note {
  midi: number;                      // MIDI pitch
  spelling?: 'sharp' | 'flat' | 'natural-C' | 'natural-F';
                                     // forces enharmonic spelling. Defaults to 'sharp'.
                                     // 'natural-C' / 'natural-F' handles B#/Cb/E#/Fb cases.
  accidentalDisplay?: 'show' | 'auto';
                                     // 'show' always renders the accidental glyph.
                                     // 'auto' (default) only shows when the pitch requires it.
  duration?: Duration;               // default 'whole'
}

interface Voice {
  notes: Note[];                     // simultaneous notes render as a chord
  clef?: 'treble' | 'bass';          // override per-voice for grand-staff layouts
}

interface GrandStaffProps {
  // Two shapes accepted. Single-voice short form:
  notes?: Note[];                    // shorthand for voices=[{ notes }]
  // Or explicit multi-voice form for grand-staff chords spanning clefs:
  voices?: Voice[];

  clef?: 'treble' | 'bass' | 'grand';// default 'grand'. Used when `notes` shorthand is passed.
  width?: number;                    // SVG px; default from container
  className?: string;
}
```

The component wraps VexFlow in a `useRef`/`useEffect` pattern: mount-on-ref, render-on-prop-change, clean up on unmount. For `clef: 'grand'` with a single `notes` array, each note is auto-assigned to treble or bass: MIDI ≥ 60 goes treble, MIDI < 60 goes bass (middle-C itself goes treble since it sits on the ledger line between the clefs). A single-array chord whose notes cross middle-C is split across clefs by this same rule; callers wanting fully deterministic cross-clef placement use the `voices` form instead.

**v1 NoteReading usage:** `<GrandStaff notes={[oneNote]} clef="grand" />` — a one-element array. But the component is exercised with multi-note inputs in its own unit tests (§12) from day one, so we validate the general behavior before any caller depends on it.

### 5.2 VexFlow integration

- Add `vexflow` to `package.json` dependencies. MIT licensed, ~200KB minified.
- Import as `import { Factory, Stave, StaveNote, Accidental, Formatter } from 'vexflow';` — modular tree-shaken API.
- Render into an SVG element. No Canvas fallback needed for v1.
- No CSS-in-JS; VexFlow emits pure SVG that inherits the card's `color` via CSS (used for theme compat).

### 5.3 AnswerButtons

```ts
interface AnswerButtonsProps {
  acceptableAnswers: Label[];       // labels that count as correct this round
  wrongPresses: Label[];            // labels already marked red this round
  answerState: 'waiting' | 'correct'; // (wrong is per-button via wrongPresses)
  justPressedCorrect: Label | null; // label to flash green briefly, then clear
  onPress: (label: Label) => void;
}
```

No multi-select support in v1 — that's a future addition for chord/interval modes. The component is structured so adding a `mode: 'single' | 'multi'` prop later is a narrow change, but no dead code or unused UI is shipped today.

## 6. State model

New `noteReading` slice in `src/store/useStore.ts`.

```ts
type Mode = 'staff' | 'fretboard';
type AnswerState = 'waiting' | 'correct';
type Label =
  | 'C'  | 'D'  | 'E'  | 'F'  | 'G'  | 'A'  | 'B'
  | 'C#' | 'D#' | 'E#' | 'F#' | 'G#' | 'A#' | 'B#'
  | 'Cb' | 'Db' | 'Eb' | 'Fb' | 'Gb' | 'Ab' | 'Bb';

interface StaffPrompt {
  kind: 'staff';
  midi: number;
  clef: 'treble' | 'bass';
  spelling: Label;                   // required answer
}

interface FretboardPrompt {
  kind: 'fretboard';
  midi: number;
  stringIndex: number;               // 0..5, index into current tuning
  fret: number;                      // 0..12
  acceptableAnswers: Label[];        // one or two enharmonic spellings
}

type Prompt = StaffPrompt | FretboardPrompt;

interface NoteReadingState {
  mode: Mode;
  prompt: Prompt | null;
  answerState: AnswerState;
  wrongPresses: Label[];
  justPressedCorrect: Label | null;  // transient, cleared on next prompt
  hadWrongThisRound: boolean;        // for streak tracking
  score: {
    correct: number;
    total: number;
    streak: number;
    bestStreak: number;
  };
}
```

Actions:

- `setNoteReadingMode(mode)` — switches mode and calls `nextPrompt` internally.
- `nextPrompt()` — generates a new prompt appropriate to current mode; clears `wrongPresses`, `answerState`, `justPressedCorrect`, `hadWrongThisRound`.
- `pressAnswer(label)` — runs validation (§7.3). Updates score, `wrongPresses`, `answerState`, `justPressedCorrect` atomically.
- `resetScore()` — zeroes all score fields.

### 6.1 Initial state

```ts
noteReading: {
  mode: 'staff',
  prompt: null,                      // generated on first render
  answerState: 'waiting',
  wrongPresses: [],
  justPressedCorrect: null,
  hadWrongThisRound: false,
  score: { correct: 0, total: 0, streak: 0, bestStreak: 0 },
}
```

## 7. Logic (pure functions in `noteReadingLogic.ts`)

### 7.1 Prompt generation

```ts
pickStaffPrompt(): StaffPrompt
```

- Randomly choose clef: 50% treble, 50% bass.
- For treble: pick MIDI uniformly from 60–84 (C4–C6).
- For bass: pick MIDI uniformly from 40–60 (E2–C4).
- Pick a spelling for the MIDI. Natural pitches (C D E F G A B) always spell naturally. Black-key pitches spell as sharp or flat with 50/50 weight. A small probability (~10%) spells a naturally-natural pitch enharmonically (C→B#, E→Fb, F→E#, B→Cb) to keep the full 21-button grid exercised.
- `spelling` is the `Label` the user must click.

```ts
pickFretboardPrompt(tuning: Tuning): FretboardPrompt
```

- Pick a uniform random `stringIndex` in `[0, 5]` and `fret` in `[0, 12]`.
- Compute MIDI from tuning + fret.
- Compute `acceptableAnswers`: all `Label`s in our 21-label set whose pitch matches this MIDI. In practice 1 (naturals) or 2 (sharps/flats).

### 7.2 No immediate repeats

`nextPrompt()` compares the new prompt to the previous one. If they match on the pitch-identity axis (same `spelling` for staff, same `midi` for fretboard), regenerate up to 3 times, then accept. Guarantees termination; the 3-attempt cap prevents pathological loops on small answer spaces.

### 7.3 Validation

```ts
validateAnswer(prompt: Prompt, label: Label): 'correct' | 'wrong'
```

- Staff: `correct` iff `label === prompt.spelling`.
- Fretboard: `correct` iff `prompt.acceptableAnswers.includes(label)`.

### 7.4 Label ↔ MIDI helpers

Small tables mapping label → pitch-class (mod 12) and pitch-class → canonical spellings. Used for prompt generation and validation. Shared with `GrandStaff` to reduce duplicated music-theory logic.

## 8. Audio integration

### 8.1 Piano (Staff mode)

`smplr` is already in `package.json`. Add a lazy-initialized singleton in `src/audio/piano.ts`:

```ts
import { SplendidGrandPiano } from 'smplr';
import { getAudioContext, getMasterGain } from './engine';

let piano: SplendidGrandPiano | null = null;

export const getPiano = async (): Promise<SplendidGrandPiano> => {
  if (piano) return piano;
  piano = new SplendidGrandPiano(getAudioContext(), {
    destination: getMasterGain(),
  });
  await piano.loaded();
  return piano;
};

export const playPianoNote = async (midi: number, duration = 1.2) => {
  const p = await getPiano();
  p.start({ note: midi, duration });
};
```

First call triggers the sample download from the smplr CDN. Until loaded, calls await. Graceful — the user just hears the note a bit late on the first correct answer of the session.

### 8.2 Guitar (Fretboard mode)

Reuses the existing `playNote` from `src/audio/synth.ts`:

```ts
playNote(prompt.midi, 1.2, undefined, { instrument: 'acoustic_guitar_nylon' });
```

No new code. If `acoustic_guitar_nylon` isn't preloaded yet, `playNote` falls back to the oscillator synth — acceptable and already the app's established fallback pattern.

### 8.3 Audio context activation

Browser autoplay policies require a user gesture to unlock the audio context. The user's answer-button click is that gesture, so audio works from the first correct answer onward without special handling. The audio engine's existing context-resume logic covers this.

## 9. Card system integration

1. **Register in store** (`src/store/useStore.ts`):
   ```ts
   { id: 'noteReading', title: 'Note Reading', isActive: true, layout: 'vertical' }
   ```
   Added near other training-type cards, before `jam`.

2. **Render in App** (`src/App.tsx`, `renderCardContent` switch):
   ```ts
   case 'noteReading':
     return <NoteReading />;
   ```

3. **Theme styling** (`src/components/Card.tsx`, `getCardType`):
   ```ts
   if (title.includes('Note Reading')) return 'noteReading';
   ```
   Add a `noteReading` color entry to each theme in `themes.json`. Suggest a blue/teal palette distinct from the existing NoteTrainer card (which is visually gold/warm for circle-of-fifths work).

## 10. Forward compatibility

What's **already built-in** in v1 and requires no future work:

- **Any-shape staff notation.** `GrandStaff` renders single notes, chords, and multi-voice grand-staff passages across treble / bass / grand today (§5.1, §12). Future chord-ID and interval cards will call it as-is.
- **Enharmonic spellings.** The `Note.spelling` field handles B# / Cb / Fb / E# from day one.
- **Multiple note durations.** `Note.duration` supports whole/half/quarter/eighth/sixteenth. v1 prompts use whole notes; the field is not ignored — VexFlow honors it on every render.

What's **intentionally deferred** as separate specs:

- **Multi-select answer buttons.** `AnswerButtons` v1 is single-select only. Adding a `mode: 'single' | 'multi'` prop later is a localized change because the component is kept small and pure. No multi-select UI is shipped dead today.
- **Inverse exercises (E1, E2, E5).** These need click-the-prompt interaction surfaces (clickable fretboard, clickable staff). They will be separate card(s) reusing `GrandStaff`, the existing `Fretboard`, the audio layer, and label/MIDI helpers. Nothing about v1 prevents them.
- **Chord identification card.** A future spec. It will *use* `GrandStaff` unchanged — this is the payoff for building the component generally now.

## 11. Naming note

The existing `src/components/NoteTrainer.tsx` is a circle-of-fifths root-note auto-advancer used with the metronome; it is **not** a quiz. The new card is deliberately named `Note Reading` (file: `NoteReading/`) to avoid the collision. No changes to `NoteTrainer` are proposed.

## 12. Testing plan

### 12.1 Unit (Jest)

- `noteReadingLogic.ts` pure functions: prompt generation stays in ranges, validation accepts enharmonics only for fretboard mode, no-immediate-repeat guard.
- `GrandStaff` rendering is exercised with **multi-note inputs from day one**, even though the card only uses single notes. The component's test suite includes:
  - A single whole note on treble, bass, and grand clef.
  - A 3-note chord on a single clef.
  - A 5-note chord that crosses the middle-C boundary (grand staff, multi-voice form).
  - Every accidental case: sharp, flat, natural-enforced (B#, Cb, E#, Fb), no-accidental.
  - Every supported duration (whole, half, quarter, eighth, sixteenth) renders without throwing.
- These tests exist so future chord / interval cards can trust `GrandStaff` without each card having to re-test it.

### 12.2 Manual in browser

Start dev server, add the card, cycle through ~30 prompts in each mode, confirm: audio plays on correct, red-stays-red on wrong, streak math, best-streak updates, reset clears everything, mode toggle works mid-session.

## 13. Open questions

None blocking. Items deferred to future specs are listed in §2 "Out of scope" and §10 "Forward compatibility."
