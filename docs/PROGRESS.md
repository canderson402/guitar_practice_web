# Guitar Practice — Progress & Handoff

Living document. Point the next session at this file to resume work with full context.

**Live app:** https://canderson402.github.io/guitar_practice_web
**Component preview:** https://canderson402.github.io/guitar_practice_web/#design

---

## Resume here (start of next session)

**Last session ended:** Phase 5b (Jam mode) built and working but needs testing/polish. Multiple uncommitted changes on disk.

**Uncommitted on disk** (local work, not yet in git):

Committed (5a + early 5b):
- `4ba533d` — `src/data/jamAlgorithms.ts` (initial)
- `1dd7791` — romanLabel fix
- `a9a623a` — jam store slice
- `02eb39d` — JamCard component
- `d66c383` — wire into App

Uncommitted changes on top of those commits:
- `src/data/jamAlgorithms.ts` — added bass patterns, strum patterns, humanize(), bassMidi(), strumMidis(), accent flags on drum hits
- `src/store/useStore.ts` — replaced `drumsEnabled`/`syncMetronome`/`jam.bpm` with a `mixer` object (4-part: chords/bass/strum/drums, each with volume 0-100 + muted boolean). Removed `setJamBpm`, `setJamSyncMetronome`, `setJamDrumsEnabled`. Added `setJamMixerVolume`, `setJamMixerMuted`. BPM now always reads from `metronome.bpm` (single source of truth). `advanceJamChord` and `rebuildJamQueue` only update `selectedChord`, NOT `selectedNote` (key stays fixed during jam).
- `src/components/JamCard.tsx` — full rewrite: module-level scheduler (survives card toggle), 4-part playback engine (chords via Rhodes soundfont, bass via `electric_bass_finger`, strum via `acoustic_guitar_nylon`, drums with humanized velocity), mixer UI with per-part volume sliders + mute toggles, CURRENT→NEXT chord display, manual number input for beats/chord (1-32), preloads 3 soundfont instruments on mount
- `src/components/JamCard.css` — mixer layout styles, slider styles
- `src/components/Metronome.tsx` — skips own interval when `jam.isPlaying` (jam scheduler is the single timing source)
- `src/audio/synth.ts` — tries soundfont samples first, falls back to oscillator while loading
- `src/audio/types.ts` — added `instrument?: string` to SynthOpts
- `src/audio/soundfont.ts` — NEW: lazy soundfont loader with cache, preloadInstrument(), getInstrument(), midiToNoteName()
- `src/audio/index.ts` — exports preloadInstrument
- `package.json` / `package-lock.json` — added `soundfont-player` dependency
- `src/audio/` (all 5a files) — still uncommitted from last session
- `src/ui/DesignSystemPreview.tsx` — AudioDemo section from 5a
- `docs/` — this file + specs + plans

All type-checks clean (`npx tsc --noEmit`) and builds clean (`npm run build`). User's standing rule: **never commit/push/deploy without explicit permission**.

**Known issues to address on resume:**
1. **Needs full manual testing** — the mixer/bass/strum/drums were just built, user hasn't tested yet
2. **Sound balance** — gain levels for each part may need tuning after hearing them together
3. **Strum may sound too mechanical** — could add more timing variation between notes
4. **Chord voicings are simple triads** — all in octave 3, could spread voicings for richer sound
5. **No drum fills or variation** — patterns are static loops, could add fills every 4/8 bars
6. **Metronome click sounds don't play when jam is running** — by design (drums replace clicks), but user may want an option

**Most likely first action when user returns:**
- "test the jam" → open app, enable Jam card, hit Play, iterate on sound/feel
- "commit everything" → stage all the 5a + 5b files, commit, optionally push/deploy
- "fix [specific issue]" → address whatever sounds wrong during testing
- "add more instruments" → soundfont supports 128 GM instruments, easy to add a picker

---

## Overall Plan (original decomposition)

| Phase | Scope | Status |
|---|---|---|
| 1 | Design system / component library | Done (`2396970`) |
| 2 | Generic Fretboard primitive | Done (`10f5b84` + `47bfb4f`) |
| 3 | Alternate tuning | Done (absorbed into Phase 2) |
| 4 | Piano keyboard view | Done (`6f47536`) |
| 5a | Audio engine primitives | Done (uncommitted) |
| 5b | Jam mode MVP | **Built, needs testing** |
| 5c | Musically flowing sequences | Not started |
| 5d | Audio polish | Not started |

## Phase 5a: Audio Engine Primitives — complete

Files in `src/audio/`:
- `engine.ts` — AudioContext singleton + gesture-resume
- `types.ts` — SynthOpts (now includes `instrument?: string`), Scheduler, BeatCallback
- `synth.ts` — playNote/playChord, tries soundfont first → oscillator fallback
- `drums.ts` — playKick/playSnare/playHat (synthesised)
- `scheduler.ts` — Chris Wilson lookahead scheduler (25ms scan, 100ms lookahead)
- `soundfont.ts` — lazy soundfont loader, cache, preload, midiToNoteName
- `index.ts` — barrel

**Dependency added:** `soundfont-player` (0.12.0) — loads GM SoundFont samples from CDN (MusyngKite). Default instrument: `electric_piano_1` (Rhodes). Also preloads `electric_bass_finger` and `acoustic_guitar_nylon`.

## Phase 5b: Jam Mode — built, needs testing

### Architecture

```
src/data/jamAlgorithms.ts    — pure functions, zero React/store deps
src/components/JamCard.tsx   — UI + scheduler lifecycle
src/components/JamCard.css   — styles
src/store/useStore.ts        — jam slice (JamState + JamMixer)
```

### Jam Algorithms (`jamAlgorithms.ts`)

**Types:** JamAlgorithm (9 variants), JamChord, DrumPatternName, DrumHit, BassHit, StrumHit, WalkState

**Chord walk algorithms (9 total):**

Chromatic (full 12-note circle):
- `fifths` — C→G→D→A→... (perfect 5ths)
- `fourths` — C→F→Bb→Eb→... (perfect 4ths)
- `skip1` — every other in circle (whole tone)
- `skip2` — every third (minor 3rds)

Diatonic (7 chords in key):
- `diatonic-fifths` — +4 scale degrees
- `diatonic-fourths` — +3 scale degrees
- `diatonic-thirds` — +2 scale degrees
- `ii-v` — stateful ii-V-I groups targeting each degree
- `random` — no back-to-back repeats

**Chord quality:** Parallel mode borrowing (selected scale → Aeolian → Harmonic Minor → fallback major). Then clamped to major/minor only (dim→minor, aug→major).

**MIDI derivation:** Root in octave 3 (C3=48), apply chordTypes intervals.

**Drum patterns:** rock, bossa, hiphop — each with accent flags and varied gain levels.

**Bass patterns:** Per style, plays root/fifth one octave below chord. `bassMidi(chord, degree)` helper.

**Strum patterns:** Per style, arpeggiated chord notes with 18ms stagger. `strumMidis(chord, direction, noteCount)` helper. Down/upstroke directions.

**Velocity humanization:** `humanize(baseGain, variation=0.15)` — ±random variation, clamped.

**Preset queue builder:** `buildPresetQueue(romanNumerals, root, scale)` — parses roman numerals with accidentals, suffixes, slash-bass.

### Store (`useStore.ts` jam slice)

```ts
interface JamMixer {
  chords: { volume: number; muted: boolean };
  bass:   { volume: number; muted: boolean };
  strum:  { volume: number; muted: boolean };
  drums:  { volume: number; muted: boolean };
}

interface JamState {
  mode: 'preset' | 'infinite';
  isPlaying: boolean;
  currentChordIndex: number;
  chordQueue: JamChord[];
  queueLength: number;         // default 8
  selectedPreset: string | null;
  algorithm: JamAlgorithm;     // default 'fifths'
  drumPattern: DrumPatternName; // default 'rock'
  beatsPerChord: number;       // default 4, range 1-32
  walkState: WalkState;
  mixer: JamMixer;
}
```

**Key design decisions:**
- **No `jam.bpm`** — reads from `metronome.bpm` (single BPM source)
- **No `syncMetronome` toggle** — jam always drives the metronome when playing
- **`advanceJamChord` only updates `selectedChord`**, never `selectedNote` — key stays fixed
- **`rebuildJamQueue` only sets `selectedChord` if jam is playing** — doesn't hijack chord card on key change
- **Mixer replaces old `drumsEnabled` boolean** — per-part volume + mute

### JamCard Component

- **Module-level scheduler** (`moduleScheduler`) — persists across card mount/unmount
- **4-part scheduler callback:** reads fresh state via `useStore.getState()`, plays chords (Rhodes), bass (finger bass), strum (nylon guitar), drums (synthesised) — each gated on mixer mute state, gain scaled by mixer volume
- **Preloads 3 soundfont instruments** on mount
- **UI:** mode toggle → preset/algorithm picker → CURRENT→NEXT chord display → mixer (4 rows with mute + volume slider) → BPM controls → beats/chord input → play/stop

### Metronome integration

When `jam.isPlaying`, the Metronome component skips its own setInterval. The jam scheduler calls `setCurrentBeat(beatInBar)` so the metronome beat dots still animate. No dual-clock drift.

---

## Key architecture landmarks

```
src/
├── App.tsx                          — top-level, card DnD, header, #design hash routing
├── store/useStore.ts                — Zustand store (single file)
├── ui/                              — primitive component library
├── audio/                           — Phase 5a engine + soundfont loader
│   ├── engine.ts                    — AudioContext singleton
│   ├── types.ts                     — SynthOpts, Scheduler, BeatCallback
│   ├── synth.ts                     — playNote/playChord (soundfont → oscillator fallback)
│   ├── drums.ts                     — playKick/playSnare/playHat
│   ├── scheduler.ts                 — Chris Wilson lookahead scheduler
│   ├── soundfont.ts                 — lazy instrument loader + cache
│   └── index.ts                     — barrel
├── data/
│   ├── musicData.ts                 — scales, modes, chord types, progressions, intervals
│   ├── guitarData.ts                — generateFretboard
│   ├── harmonyVoicings.ts           — findAllVoicings
│   ├── pitch.ts                     — MIDI helpers
│   └── jamAlgorithms.ts             — walk algorithms, patterns, preset builder
├── components/
│   ├── JamCard.tsx + .css           — Jam mode card (Phase 5b)
│   ├── Fretboard/                   — generic fretboard primitive
│   ├── PianoKeyboard/               — piano alternative
│   ├── FretboardOrPiano.tsx         — view-mode wrapper
│   ├── TuningPicker.tsx             — portaled popover
│   ├── GuitarNeck.tsx               — scale/chord-aware consumer
│   ├── HarmonyMaker.tsx             — base/harmony dual consumer
│   ├── ChordProgression.tsx         — chord list + highlight
│   ├── NoteTrainer.tsx              — circle-of-fifths cycler
│   ├── Metronome.tsx                — BPM + beat display (skips own interval when jam plays)
│   └── NoteSelector.tsx, Timer.tsx, CircleOfFifths.tsx, Card.tsx, etc.
└── styles/design-system.css         — tokens + .ds-* classes
```

### State shape (relevant to Jam)

```ts
// metronome.bpm is the single BPM source (jam reads it, both cards update it)
// note.selectedNote is the KEY — jam never changes it
// note.selectedChord is the highlighted chord — jam updates this as chords advance
// jam.mixer controls per-part volume and mute
```

---

## Shipped features (what's live at last deploy: 6f47536)

### Phase 1 — Design system
- `src/ui/`: Button, IconButton, Select, Checkbox, Slider, Chip, Badge, Card, ToggleButtonGroup

### Phase 2 — Generic Fretboard
- Single primitive, DotInfo variants, wood-grain, fret markers, tuning-aware, 12/24 frets

### Phase 3 — Tuning (absorbed into Phase 2)
- Global tuning in store, TuningPicker, presets, semitone nudge

### Phase 4 — Piano view
- PianoKeyboard, FretboardOrPiano, pitch.ts MIDI helpers, viewMode toggle

---

## Working style notes

- User prefers speed: brainstorm → approval → build directly. No formal spec write for small things.
- Explicit permission required for commit / push / deploy.
- Iterates rapidly on visuals — expect back-and-forth on sizing, borders, colors.
- Terse conversational tone. No verbose summaries.
- Types fast with typos — context makes intent clear.

## Universal patterns

- Global store is source of truth for anything multiple components read.
- First principles over stored derived data.
- DS primitives for all interactive elements.
- Portaled popovers for menus that might escape overflow:hidden.
- DotInfo + Fretboard/Piano duality for visual layers.

---

## Unstarted ideas (parking lot)

- Arpeggio view (new DotVariant)
- CAGED / box pattern overlays
- 3-notes-per-string patterns
- Shareable URL state
- Named user presets (localStorage)
- MIDI keyboard input (Web MIDI API)
- Audio input + pitch detection
- Practice-session tracking
- Import standard tab
- Instrument picker for jam (128 GM instruments available via soundfont)
- Swing / shuffle feel
- Drum fills every N bars
- Voice-led chord voicings (spread across octaves)

End of doc.
