---
name: Jam Mode — Audio Upgrade & Playing Feel
status: draft
date: 2026-04-16
supersedes: none
---

# Jam Mode — Audio Upgrade & Playing Feel

## Problem

Jam mode (shipped in phase 5b) plays, but the sound is "weak and pathetic":

1. **Too quiet** — even with per-part sliders at 100%, output level is low. No master volume.
2. **Thin instruments** — chord voicings are bare triads in a single octave; synth drums sound toy-like; mix has no compression/EQ to glue things together.
3. **Mechanical feel** — every chord is a block hit; hits land on the grid with no timing variation; patterns repeat identically every bar.
4. **Unit-of-time mismatch** — "beats per chord" forces mental math; most users think in bars.
5. **Visibility bug** — chord-name / "CURRENT" / "NEXT" / upcoming-chord text renders white-on-white and is unreadable.

## Goals

- Jam mode sounds **loud, full, and musical** out of the box.
- User can push any part into prominence (practice the bass line alone, etc.) without cranking the OS volume.
- Playing feel reads as "a band playing" rather than "a MIDI file rendering".
- Chord duration is expressed in bars (musician-native unit).
- All jam-card text is readable in both themes.

## Out of scope (parking lot)

- Swing / shuffle feel toggle
- Drum fills every 4/8 bars
- GM instrument picker UI (128 instruments available via soundfont-player)
- Meter changes (3/4, 6/8)
- Voice-led chord transitions (smooth-part movement between chords)

---

## Design

### 1. Mixer rework — master volume + boosted per-part sliders

**UI:** Add a **Master** row at the top of the mixer section, styled like the 4 existing rows (checkbox + slider). Master has no mute checkbox — its `muted` role is covered by Play/Stop — just a slider.

**Store:**
```ts
interface JamMixer {
  master: { volume: number };                  // NEW — range 0-150, default 100
  chords: { volume: number; muted: boolean };  // range now 0-200, default 100
  bass:   { volume: number; muted: boolean };  // range now 0-200, default 100
  strum:  { volume: number; muted: boolean };  // range now 0-200, default 100
  drums:  { volume: number; muted: boolean };  // range now 0-200, default 100
}
```

**Gain mapping:**

- **Master:** `masterGain.gain = volume / 100` (0 → silent, 100 → unity, 150 → +3.5 dB). Applied to the audio-engine master gain node via `setMasterVolume(v / 100)`.
- **Per-part:** replace the current `vol * 0.25` (chords), `vol * 0.3` (bass), `vol * 0.2` (strum), `vol * 1.0` (drums) with a single convention:
  ```
  partGain = (volume / 100) * PART_BASE[part]
  ```
  where `PART_BASE` is chosen so that `volume=100` lands at today's "full" perceived level and `volume=200` is ≈4× power (roughly +6 dB louder, close to the compressor threshold).
- Old 0-100 slider at 100% maps to the same audible output as the new 0-200 slider at 100%. Existing saved state (if any) is fine; we clamp to new range.

**Slider ticks:** Visual ticks at 0 / 100 / max (150 for master, 200 for parts) so "normal" has a reference mark. Implement via `<datalist>` or CSS `::before` marks.

**Clipping guard:** User cannot cause hard clipping because the compressor (section 4) soft-limits peaks before the destination.

### 2. Chord voicing overhaul

Current: bare triad, all notes in octave 3 (root + 3rd + 5th).

New voicing builder (in `jamAlgorithms.ts`):

```ts
// Inputs: chord type (major/minor), roman numeral context (so we know
// if this is a V chord that should get a 7), root MIDI.
// Output: array of MIDI notes, spread across ~1.5 octaves.
function buildVoicing(chord: JamChord, isDominant: boolean): number[]
```

- **Bass root** at octave 2 (MIDI 36 for C).
- **Body:** 3rd and 5th in octave 3.
- **Top:** root in octave 4, plus an optional **7th in octave 3** when `isDominant` is true or the chord symbol contains `7`.
- **Drop-2 voicing** for open sound: take the voicing top-down, drop the 2nd-highest note one octave. Produces pianistic spread.

`isDominant` detection:
- Preset-mode: chord built from roman `V` or `V7` or any symbol with `7`.
- Infinite-mode: `false` for now (algorithms don't track function). Fine — they sound OK as triads anyway.

**Chord sustain:** `chordDuration = beatDuration * beatsPerBar * barsPerChord * 0.95` (was 0.9).

### 3. Real drum samples (GM drum kit)

`soundfont-player` supports GM drum channel (channel 10). Actually, `soundfont-player` itself loads melodic instruments; for drums we use **MIDI drum note names** via a melodic instrument that has drum kit samples, OR we keep the synthesised fallback and just sharpen it.

**Chosen approach:** load `synth_drum` as a melodic instrument and map our drum events to specific MIDI notes:

- Kick = MIDI 36 (B1) — "acoustic bass drum"
- Snare = MIDI 38 (D2) — "acoustic snare"
- Closed hat = MIDI 42 (F#2)
- Open hat = MIDI 46 (A#2)

Test during implementation: if `synth_drum` via MusyngKite doesn't expose drum-map notes, fall back to `gunshot` or a dedicated drum font (`FluidR3_GM` bank has a drums preset — check if soundfont-player CDN exposes it). If no GM drumkit reaches us from the CDN, **keep synthesised drums but sharpen them** (tighter envelopes, add transient click on kick, layered body on snare). This fallback is tracked explicitly in the plan.

**API unchanged:** `playKick(startTime, gain)`, `playSnare(...)`, `playHat(startTime, closed, gain)`. Internals swap to sample playback with oscillator fallback while loading — same pattern synth.ts uses today.

### 4. Master bus compressor + gentle shelf EQ

Insert two nodes between existing `masterGain` and `ctx.destination`:

```
sources → masterGain → [low-shelf EQ] → [high-shelf EQ] → [compressor] → destination
```

- **Low-shelf:** +2 dB at 80 Hz (warmth in the bass/kick).
- **High-shelf:** +1.5 dB at 5 kHz (air/presence on cymbals, nylon guitar).
- **Compressor:** `DynamicsCompressorNode` — threshold −18 dB, ratio 3:1, attack 10 ms, release 150 ms, knee 6 dB.

**Why not on each part?** Per-part compression is overkill for this scope. A single bus compressor is the simplest way to get "glued" sound, and it's reversible/tunable in one place.

**Engine module changes:** `engine.ts` grows three new private nodes and wires them into the chain. Public API (`getMasterGain`, `setMasterVolume`) unchanged — `masterGain` is still the pre-bus-processing node everything connects to.

### 5. Playing-feel variation

Three mechanisms, all in `jamAlgorithms.ts` and the jam scheduler callback:

**a) Chords arpeggiated, not block-hit.**
On the downbeat of each chord, stagger the voicing notes with 14-ms gaps (bottom-up on a "down" strum). Uses the same mechanism as the current strum pattern. Applies to the chord pad (Rhodes), not the separate strum layer.

**b) Micro-timing humanize.**
Add `humanizeTime(baseTime, variation = 0.008)` helper: returns `baseTime + (random - 0.5) * 2 * variation`. Apply to every non-downbeat hit (bass after beat 1, hat offbeats, strum offbeats). Do NOT apply to chord downbeats or kick-on-1 — anchors stay tight.

**c) Pattern variation across bars.**
Extend `DrumHit`, `BassHit`, `StrumHit` with an optional `bar: 0 | 1` field. Patterns become 2-bar cycles; bar index = `Math.floor(beatIndex / 4) % 2`. Scheduler filters hits by `bar` field (undefined = both bars).

Concrete 2-bar variations (rock style):
- Bar 0: standard kick-snare-kick-snare.
- Bar 1: drop the kick on beat 3; open hi-hat on "and" of 4; bass plays a passing tone leading to next chord.

Deterministic — no randomness in pattern choice. This keeps it feeling composed, not glitchy.

### 6. Bars-per-chord (rename from beats-per-chord)

- Store field `jam.beatsPerChord: number` → `jam.barsPerChord: number` (default 2, range 1-16).
- Setter `setJamBeatsPerChord` → `setJamBarsPerChord`.
- Scheduler computes `beatsPerChord = barsPerChord * 4` internally.
- UI label "Beats/chord" → "Bars/chord".
- No migration needed (local state only; no persistence).

### 7. Visibility fixes

Audit `JamCard.css` for hard-coded colors. Replace white-on-white with design-system tokens:
- `.jam-chord-label` ("CURRENT" / "NEXT") — use `--ds-color-text-muted`
- `.jam-chord-note` — use `--ds-color-text`
- `.jam-chord-roman` — use `--ds-color-text-muted`
- `.jam-upcoming-note` — use `--ds-color-text`
- Any other offender found during audit

**Verification:** render the jam card in both light and dark themes and confirm all text is readable (the app has theme support — DesignSystemPreview exercises both).

---

## Architecture & file impact

| File | Change |
|---|---|
| `src/audio/engine.ts` | Insert compressor + 2 shelf EQ nodes into master chain. Export stays stable. |
| `src/audio/drums.ts` | Swap to sample-based drums with synth fallback. Public API unchanged. |
| `src/audio/soundfont.ts` | Preload drum kit; handle potential CDN failure gracefully (return null → fallback). |
| `src/data/jamAlgorithms.ts` | Add `buildVoicing()`, `humanizeTime()`. Extend pattern hit types with optional `bar: 0\|1`. Add bar-1 variants of rock/bossa/hiphop patterns. |
| `src/store/useStore.ts` | Rename `beatsPerChord` → `barsPerChord`. Add `mixer.master`. Widen volume ranges. Add `setJamMixerVolume` master support. |
| `src/components/JamCard.tsx` | Replace block-chord playback with arpeggiated voicing. Apply humanizeTime. Pick patterns per-bar. Call `setMasterVolume` when master slider changes. Render new master row + visible ticks. Rename label. |
| `src/components/JamCard.css` | Fix text colors. Add slider tick mark styles. Master row styling. |

## Testing & verification

Manual (primary — this is audio):

1. Start jam, confirm overall level is louder than before at default settings.
2. Crank master to 150 — no hard-clipping, no crackle.
3. Push chords to 200, others to 0 — chord part is noticeably louder.
4. Mute drums, unmute bass only — bass plays cleanly, is audibly thicker than a single note.
5. Switch to preset with a V chord — the V sounds dominant-7-flavoured (extra note on top).
6. Watch the chord-change moments — hear the strum across chord tones, not a single block.
7. Listen for 2 bars — pattern variation is audible (kick drops, hat opens).
8. Change bars-per-chord from 2 → 4 → 1 — chord holds match.
9. Open jam card in both light and dark themes — all text readable.

Automated:
- `npx tsc --noEmit` passes.
- `npm run build` passes.

## Risks & unknowns

- **Drum kit availability on CDN:** MusyngKite may not expose a GM drum map via `soundfont-player`. Mitigation: feature-detect, fall back to the sharpened synthesised drums. Plan step explicitly tests this before committing to the sample path.
- **Compressor "pumping":** a 3:1 compressor with 10 ms attack could pump audibly on a loud kick. If it does, soften to 2:1 or raise threshold to −12 dB. Tune during manual testing.
- **Drop-2 voicings on inversions:** current chord generation doesn't track inversion; drop-2 on a triad is mechanically well-defined and won't produce wrong notes. No risk there.
- **Humanize on kick-on-1:** deliberately disabled, because the downbeat is the one place the listener's clock lives. Confirmed during review.

## Open questions (resolved during brainstorm)

- Per-part slider boost target: 200% (≈ +6 dB at max) ✓
- Master volume range: 0-150% ✓
- Chord voicing: drop-2, add 7th only when dominant ✓
- Drum samples: try GM first, sharpen-synth fallback ✓
- Pattern variation: deterministic 2-bar cycles, not random ✓
- Unit change: bars, not beats ✓
