# Phase 5b: Jam Mode MVP — Design Spec

## Overview

New standalone "Jam" card that uses the Phase 5a audio primitives to play chord progressions with drums at tempo. Two modes: **Preset** (pick from existing progressions) and **Infinite** (algorithmic diatonic/chromatic chord walk). The fretboard, piano, and chord views all react automatically as chords advance.

---

## Modes

### Preset Mode

- Pulls from `majorProgressions` / `minorProgressions` in `musicData.ts`
- User picks a preset from a grouped dropdown
- `chordQueue` populated by resolving each roman numeral against `getScaleChords(root, scale)` to get concrete chords with MIDI notes
- Loops when the progression ends
- Upcoming view shows the full progression with a cursor on the current chord
- Switching presets mid-play rebuilds the queue and restarts from beat 1

### Infinite Mode

Algorithmic chord walk with two families of algorithms:

**Chromatic (full 12-note circle):**

| Algorithm | Walk pattern (from C) | Musical interval |
|---|---|---|
| Fifths | C → G → D → A → E → B → Gb → Db → Ab → Eb → Bb → F | Perfect 5th |
| Fourths | C → F → Bb → Eb → Ab → Db → Gb → B → E → A → D → G | Perfect 4th |
| Skip 1 | C → D → E → Gb → Ab → Bb | Whole tone |
| Skip 2 | C → A → Gb → Eb → ... | Minor 3rds |

**Diatonic (7 chords in key only):**

| Algorithm | Walk pattern (C major) | Description |
|---|---|---|
| Diatonic Fifths | C → G → Dm → Am → Em → Bdim → F | Circle of 5ths filtered to key |
| Diatonic Fourths | C → F → Bdim → Em → Am → Dm → G | Reverse |
| Diatonic Thirds | C → Am → F → Dm → Bdim → G → Em | Every other in 5ths cycle |
| ii-V | Dm→G→C, Em→Am→Dm, ... | ii-V pairs targeting each diatonic chord |
| Random | Any diatonic chord, no back-to-back repeats | Unpredictable but in-key |

The queue always maintains N chords ahead (default 8). Each time the scheduler advances, pop from front, generate one new chord at the tail.

---

## Non-Diatonic Chord Quality

When the chromatic walk lands on a note outside the current key, determine chord quality via parallel mode borrowing:

1. Check the **selected scale** — if the note is diatonic, use its stacked-thirds quality (already the base case)
2. Check **parallel minor** (aeolian of same root) — catches bIII, bVI, bVII (all major)
3. Check **harmonic minor** — catches major V in minor contexts
4. **Fallback: major** — for anything still unmatched (Neapolitan bII, tritone subs)

Implementation: reuse `getScaleChords()` against each mode in the fallback chain. ~5 lines of logic.

---

## MIDI Derivation

Each chord root maps to a comping octave to keep voicings in a tight mid-range:

- Roots C through F#: base octave 3 (C3 = MIDI 48)
- Roots G through B: base octave 3 (G3 = MIDI 55)

Apply `chordTypes[type].intervals` to the root MIDI number to get the full chord MIDI array. Pass to `playChord(midis, duration, startTime)` from the 5a synth.

---

## Drum Patterns

Three built-in patterns, each a data structure of `{ instrument, beatPosition, gain }` entries within one 4/4 measure:

### Rock
- Kick: beats 1, 3
- Snare: beats 2, 4
- Hat: every eighth note (8 hits)

### Bossa
- Kick: beat 1, and-of-2, beat 4
- Snare: beats 2, 4 (lighter gain ~0.3)
- Hat: every eighth note

### Hip-hop
- Kick: beat 1, and-of-3
- Snare: beats 2, 4
- Hat: every sixteenth note (16 hits, lighter gain ~0.2)

The scheduler's `onBeat` callback reads the current pattern and fires `playKick`/`playSnare`/`playHat` at the correct `audioTime`. Adding patterns later is just adding more arrays.

---

## Store

New `jam` slice in the Zustand store:

```ts
interface JamChord {
  note: string;       // 'C', 'D', etc.
  type: string;       // 'major', 'minor', 'diminished', etc.
  symbol: string;     // '', 'm', '°'
  roman: string;      // 'I', 'iv', 'V'
  midi: number[];     // e.g. [48, 52, 55]
}

interface JamState {
  mode: 'preset' | 'infinite';
  isPlaying: boolean;
  bpm: number;
  currentChordIndex: number;
  chordQueue: JamChord[];
  queueLength: number;              // how many to show ahead (default 8)
  selectedPreset: string | null;     // key into majorProgressions/minorProgressions
  algorithm: JamAlgorithm;
  drumsEnabled: boolean;
  drumPattern: 'rock' | 'bossa' | 'hiphop';
  beatsPerChord: number;             // beats before advancing (default 4, range 1-8)
  syncMetronome: boolean;            // sync metronome BPM + beat counter
}

type JamAlgorithm =
  | 'fifths' | 'fourths' | 'skip1' | 'skip2'
  | 'diatonic-fifths' | 'diatonic-fourths' | 'diatonic-thirds'
  | 'ii-v' | 'random';
```

### Actions

- `setJamMode(mode)` — switch preset/infinite, rebuild queue
- `setJamPlaying(playing)` — start/stop scheduler
- `setJamBpm(bpm)` — update BPM, optionally sync metronome
- `setJamPreset(preset)` — select preset, rebuild queue
- `setJamAlgorithm(algo)` — select walk algorithm, rebuild queue
- `setJamDrumsEnabled(enabled)` — toggle drums
- `setJamDrumPattern(pattern)` — switch drum pattern
- `setJamBeatsPerChord(beats)` — set chord duration
- `setJamSyncMetronome(sync)` — toggle metronome sync
- `advanceJamChord()` — called by scheduler, advances cursor, appends to queue in infinite mode, updates `selectedNote` + `selectedChord`

### Store integration

When `advanceJamChord()` fires, it updates `note.selectedNote` and `note.selectedChord` in a **single** `set()` call. This is important because `setSelectedNote` clears `selectedChord` — calling them sequentially would flash the chord to null. The advance action writes both fields atomically.

Fretboard, piano, and chord card all react automatically since they already read from these.

---

## Card UI

New card: `{ id: 'jam', title: 'Jam', isActive: false, layout: 'horizontal' }`

Layout top to bottom:

1. **Mode toggle** — `ToggleButtonGroup`: Preset / Infinite
2. **Preset picker** (preset mode) — `Select` dropdown grouped by style
3. **Algorithm picker** (infinite mode) — `Select` dropdown with Chromatic / Diatonic groups
4. **Chord display** — large current chord (note name + roman numeral), horizontal row of upcoming chords fading right
5. **Drum row** — pattern picker (`Select`: Rock / Bossa / Hip-hop) + drums on/off (`Checkbox`)
6. **BPM control** — ±1/±5 buttons + BPM display + sync toggle (`Checkbox`)
7. **Beats per chord** — `Select` or number input (1-8, default 4)
8. **Play / Stop** — `Button` primary/danger

All interactive elements use DS primitives from `src/ui/`.

---

## Module Structure

```
src/data/jamAlgorithms.ts    — generateNextChord(), getChordQuality(), algorithm implementations
src/components/JamCard.tsx   — the card component
src/components/JamCard.css   — styles
```

- `jamAlgorithms.ts` is a pure-function module, no React, no store dependency. Takes current state (key, scale, algorithm, current chord, scale chords) and returns the next chord. Testable in isolation.
- Scheduler lifecycle (create/start/stop) managed by a `useRef` inside `JamCard.tsx`, same pattern as the AudioDemo in DesignSystemPreview.
- Store slice added directly to `useStore.ts` (same pattern as all other slices).

---

## Metronome Sync

When `syncMetronome` is true:
- Starting Jam also calls `setMetronomePlaying(true)` and `setBpm(jam.bpm)`
- The Jam scheduler drives `setCurrentBeat()` so the metronome beat dots animate
- Changing BPM in Jam updates `metronome.bpm` and vice versa
- Stopping Jam stops the metronome

When false: Jam and metronome are fully independent with separate AudioContexts (Metronome keeps its own, Jam uses the 5a engine singleton).

---

## Configuration

Add `'jam'` to the `'all'` configuration preset's `enabledCards` array.
