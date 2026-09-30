# v2 Redesign: Brand, Foundation, Shell & Card Framework — Design Spec

**Date:** 2026-09-30
**Scope:** The first build of v2, a from-scratch rewrite of the Guitar Practice UI with one branded identity. It covers the architecture, design foundation, component kit, app shell and card framework. Individual card faces, the Read page rebuild and Learn content are specified later (§10).
**Status:** Draft for review.

## 1. Purpose

The current UI grew ad hoc:

- two competing styling systems (`--ds-*` tokens, plus seven gradient themes in about 1,400 lines of CSS)
- no real navigation (sections are switched from a header dropdown)
- two different `Card` components
- inconsistent controls
- shared state (key, tempo, playing) that's hard to see

The result is confusing. v2 replaces the UI with one cohesive product while keeping what works: the card-based Practice page, and cards as **views onto the single app-wide state** (key, scale, tempo, transport).

### Audience

- Primarily intermediate players who want a serious practice tool.
- A beginner path (Learn) graduates into the Practice tools.

### Guiding principles

Distilled from the Figma, Apple HIG, Duolingo and Google design-principle readings:

1. **Consistency and familiarity.** One card anatomy and one control style. Shared-state controls look and behave the same everywhere. Build on guitarist conventions (fretboard orientation, notation).
2. **Simple, not minimal.** Show what's needed and put the rest in settings. Each card has one obvious main action.
3. **Engage beginners, attract experts.** Learn guides; Practice reveals depth only when asked.
4. **Agency.** Nothing is a trap: Undo for destructive card and workspace actions, skippable lessons, freely editable workspaces.
5. **Delight through craft, not decoration.** Personality lives in sound, motion, copy and feedback moments.
6. **Two moods, one brand.** Practice is calm and focused because your hands are on the guitar. Learn is warmer. The tokens are the same for both.
7. **Speed and accessibility from the start.** Instant response, WCAG AA contrast, full keyboard operation, and color is never the only signal.

## 2. Decisions summary

| Topic | Decision |
|---|---|
| Visual direction | **Sunset Studio.** Calm studio-dark UI; the 80s gradient (pink → violet → blue) is the signature accent. Light mode too. |
| Themes | The seven user themes are retired. One brand with **dark and light** modes (plus "follow system"). |
| Name | "Guitar Practice" for now, read from a single brand config so renaming is a one-line change. |
| Navigation | Top bar: **Practice · Learn · Read**. |
| Shared-state view | A **docked player bar** at the bottom of every v2 page: a heads-up view with quick pop-ups (key, BPM, meter, volume). |
| Card settings | Most-used controls on the **card face**; everything else in a **side sheet** from the right (a bottom sheet on phones). No settings pop-up anchored to the card. |
| Card sizing | **Designed sizes** per card type (width and height); the grid packs densely; you choose content and order. |
| Reorder | Drag a card by its header. |
| Presets | Renamed **Workspaces**: built-in and editable, with your own added on top. |
| Persistence | Browser storage (`localStorage`). No accounts or backend. |
| Build approach | **From scratch at `/v2`**, next to v1. v1 is retired once v2 covers everything. Engines and core visual components are reused. |
| Circle cards | **Circle of Fifths** and **Note Trainer** stay separate (Note Trainer can go random, so it isn't circle-specific). Note Trainer gets a clearer name at its card review. |

## 3. Architecture

### 3.1 Location and routing

- All v2 code lives in `src/v2/`.
- Routes live under `/v2/*`: `/v2` (Practice), `/v2/learn`, `/v2/learn/:slug`, `/v2/read`.
- They're registered in `src/App.tsx` as a **lazy-loaded** route tree (`React.lazy`), outside v1's `AppShell`.
- When v2 reaches parity, its routes move to `/`, and v1 (`src/components`, `src/layouts`, `src/pages`, `src/ui`, `themes.*`, `utils/themeGenerator.ts`, v1 CSS) is deleted.

### 3.2 Reuse rules

**Reused unchanged (engine, no UI):**

- `src/store/useStore.ts`: the shared app state (key, scale, tempo, metronome, jam, note reading). v1 and v2 read the same store, so state stays consistent across both while they coexist.
- `src/audio/*`: the transport (the single metronome clock), click, pad synth, effects, piano and guitar samples.
- `src/data/*` and `src/logic/*`: music data, jam algorithms, the phrase generator, note-reading logic.

**Reused, restyled via tokens (drawing code and behavior unchanged):**

- `components/Fretboard`, `components/PianoKeyboard`, `components/GrandStaff`, `components/MelodyStaff`, `components/NoteReading/AnswerPiano`.
- Their hard-coded colors are replaced by CSS custom properties with v1-equivalent fallbacks. The pattern is `var(--note-root, #1E90FF)`: v1 keeps its look, and v2 sets the variables under `.gp2`.
- These components are imported directly by v2. They're the only v1-folder UI components v2 may import.

**Rewritten in v2:**

- the shell, navigation, dock, workspaces, grid and side sheet
- every card's face and sheet
- the component kit
- Learn and Read pages

### 3.3 Style isolation

- v1 CSS is global (body backgrounds, theme classes, `.card` rules) and stays loaded if the user visited v1 first.
- v2 therefore:
  - uses **CSS Modules** (`*.module.css`, supported by CRA) for all component styles
  - puts everything under a root element with class `gp2`, which applies its own reset and sets every token
  - sets `document.body` background and color from v2 tokens while mounted, and restores them on unmount
  - never relies on element-level global selectors

### 3.4 v2 state

A new zustand store, `src/v2/state/useV2Store.ts`, holds v2-only UI state, saved via zustand `persist` to `localStorage` under the key `gp2`:

```ts
interface V2State {
  themeMode: 'dark' | 'light' | 'system';
  workspaces: Workspace[];          // ordered
  activeWorkspaceId: string;
  learnProgress: Record<string, { readAt: number }>; // by article slug
  // actions: setThemeMode, add/rename/duplicate/remove/reorder workspace,
  //          setActiveWorkspace, add/remove/move card, markRead, undo buffer
}

interface Workspace {
  id: string;
  name: string;
  builtIn: boolean;                  // built-ins can be edited and reset, not deleted
  cards: string[];                   // card ids from the registry, in order
}
```

- **Built-in workspaces** (all editable; "Reset to default" restores them):
  - Warm-up: Metronome, Timer, Scale, Fretboard
  - Theory: Scale, Circle of Fifths, Chord, Fretboard
  - Harmony: Scale, Harmony, Fretboard
  - Jam: Jam, Scale, Fretboard
- **Undo:** remove-card and delete-workspace push a single-level undo entry, surfaced by a toast.
- **The shared store is not persisted** by this spec. The engine state stays as it is. Persisting key and tempo can be a follow-up.

## 4. Design foundation

### 4.1 Brand config

`src/v2/brand.ts`:

```ts
export const BRAND = {
  name: 'Guitar Practice',
  tagline: 'Practice with intent.',
  // logo mark = gradient rounded square, rendered by <LogoMark/>
} as const;
```

- The logo, `document.title`, the About text and Learn copy all read from `BRAND`.
- No brand strings appear anywhere else (a lint-style test greps `src/v2` for the literal name outside `brand.ts`).

### 4.2 Color tokens

- Defined in `src/v2/styles/tokens.css` under `.gp2[data-theme='dark']` and `.gp2[data-theme='light']`.
- "System" resolves via `prefers-color-scheme`.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | #14121a | #f6f4f9 | Page background |
| `--surface` | #1b1822 | #ffffff | Cards, dock |
| `--surface-raised` | #221e2b | #ffffff | Sheets, pop-ups |
| `--fill` | #26222f | #efebf5 | Chips, segmented tracks, stepper buttons |
| `--line` | #2b2735 | #e4dfec | Borders |
| `--line-strong` | #3a3446 | #d4cde0 | Sheet and pop-up borders, drag outlines |
| `--text` | #ece9f2 | #1c1824 | Primary text |
| `--text-muted` | #8d879a | #6f6880 | Labels, secondary text |
| `--text-inverse` | #14121a | #ffffff | Text on `--text`-colored fills |
| `--accent` | #ff3d7f | #e5256a | Selection, active indicators, focus hue |
| `--success` / `--danger` / `--warning` | #3ecf8e / #ff5c5c / #ffb547 | #148a57 / #d0343a / #b26b00 | Feedback (correct/wrong, destructive, caution) |
| `--focus-ring` | 0 0 0 3px accent @ 35% | same | Keyboard focus |
| `--gradient-signature` | linear-gradient(135deg, #ff3d7f, #a347ff 58%, #3d8bff) | same | See rules below |

**Gradient rules:** the signature gradient is used **only** on:

- the logo mark
- the main play/stop action
- active slider fills
- the "selected" state of primary toggles

Never on text, backgrounds or large surfaces.

**Music tokens** (shared by fretboard, piano and staff):

- `--note-root`: accent
- `--note-scale`
- `--note-chord`
- `--note-muted`
- `--note-label`

The root note always also has a distinct shape (ring) and a text label, so color isn't the only signal.

**Contrast:** every text/background pairing meets WCAG AA (4.5:1 body text, 3:1 large text and UI glyphs). This is verified by a unit test over the token table (§9).

### 4.3 Typography

- **Families, bundled via `@fontsource/*` (no external requests):**
  - Space Grotesk (logo, headings, chord names)
  - Inter (UI and body)
  - JetBrains Mono (changing numbers: BPM, timer, countdowns, with tabular digits)
- **Scale tokens** `--text-11 … --text-48`: 11 / 12 / 14 / 16 / 20 / 24 / 32 / 48 px.
- **Learn reading style:** 17px Inter, line-height 1.6, `max-width: 68ch`.
- **Labels:** sentence case. Uppercase letter-spaced text is reserved for card titles at 10–11px.

### 4.4 Space, shape, depth, motion

- **Spacing:** 4px base (`--space-1` … `--space-10`).
- **Radii:** `--radius-sm` 6, `--radius-md` 10, `--radius-lg` 14, `--radius-pill`.
- **Depth:**
  - Three levels (`--elev-1..3`).
  - Dark mode relies on borders plus a subtle shadow; light mode relies on soft shadows.
- **Motion:**
  - `--dur-fast` 120ms, `--dur-base` 200ms, and one easing curve (`--ease`).
  - Beat-synced visuals never transition *in*, only out.
  - `prefers-reduced-motion` disables non-essential motion.

### 4.5 Sound identity

- One small UI sound set: correct, wrong, lesson complete.
- Scheduled through the existing audio engine and governed by master volume.
- Nothing plays without a user action.
- (Sight-reading already plays the answer note; these sounds replace ad-hoc feedback, not the note audio.)

### 4.6 Icons and voice

- **Icons:** `lucide-react` (tree-shaken). One icon set everywhere.
- **Voice:** musician-to-musician, plain, encouraging, short ("Add card", "Next in 3 bars", "Nice, that's a C").

## 5. Component kit (`src/v2/ui/`)

Every component uses tokens only (no raw colors), is keyboard-operable with visible focus, and has a `*.module.css`.

| Component | Notes |
|---|---|
| `Button` | Variants: `primary` (gradient), `secondary`, `ghost`, `danger`. Sizes sm/md. |
| `IconButton` | Lucide icon plus a required `label` (aria-label). |
| `SegmentedControl` | Single choice; arrow keys move the selection. |
| `Picker` | Grid or list chooser; used for key and scale. |
| `Slider` | Gradient fill, keyboard steps, optional value readout. |
| `Stepper` | −big / −small / value / +small / +big (e.g. BPM ±5 ±1). |
| `Switch`, `Chip` | Chips for "follows key/tempo" and dock items. |
| `Tabs` | Workspaces: reorderable (dnd-kit), with overflow scrolling. |
| `Card` | The card anatomy (§7.2). |
| `SideSheet` | Right-edge panel on desktop, bottom sheet under 768px. Focus stays inside; Esc closes. |
| `Popover` | Used by dock quick controls. Opens upward from the dock; Esc or clicking outside closes it. |
| `Tooltip`, `Dialog`, `Toast` | Toast carries an optional "Undo" action. |

`/v2/kit` renders every component in both modes. It replaces v1's `/design` for v2.

## 6. App shell

### 6.1 Top bar

- **Left:** `LogoMark` and `BRAND.name`.
- **Center-left:** nav links Practice · Learn · Read, with an underline indicator on the active one.
- **Right:**
  - a theme toggle (cycles dark → light → system)
  - a ⚙ that opens app settings in a SideSheet:
    - theme mode
    - guitar tuning (the shared `note.tuning`)
    - master volume
- Nothing else lives in the header.

### 6.2 Docked player bar

Present on every v2 page. A heads-up view of the shared state:

| Item | Shows | Click opens |
|---|---|---|
| Play/stop | Transport state (gradient button) | (toggles `metronome.isPlaying`) |
| Key chip | e.g. "A minor" | Key pop-up: 12 keys in circle-of-fifths order, plus Major / Minor / Modes… (the scale picker) |
| BPM | Mono number | Tempo pop-up: Stepper ±1/±5, Slider 40–300, **Tap tempo** |
| Beat dots | Heard beat position (`useTransport`) | — |
| Summary | "4/4 · ♩ · 🔊 80%" | Meter and volume pop-up: time signature, subdivision, master / click / pad volume |

- **Keyboard shortcuts** (global in v2, ignored while typing in inputs): Space = play/stop, ↑/↓ = BPM ±1 (Shift ±5), K = key pop-up.
- **Tap tempo:** the average of the last 4 tap intervals; resets after a gap of 2 seconds or more; clamped to 40–300.

### 6.3 Practice page

- **Workspace tabs:**
  - select, rename (double-click or menu), duplicate, delete (with Undo), and drag to reorder
  - "＋" creates an empty workspace
  - built-ins offer "Reset to default"
- **"Add card" button:** opens a picker listing registry cards (title, description, size) not already in the workspace.
- **Card grid:**
  - 12 columns at 1200px and up, 8 columns from 768px to 1199px, 1 column below 768px
  - each card type declares `colSpan` (3, 4, 6 or 12; capped at the column count) and `rowSpan` in 40px row units
  - CSS grid with `grid-auto-flow: dense`, so there are no holes and no stretched cards; each card type also sets a max face width
- **Reorder:** drag a card by its header (dnd-kit sortable). A drop placeholder shows the target slot.
- **Empty workspace:** a message, the "Add card" button and "Start from Warm-up".

### 6.4 Side sheet behavior

- ⚙ on a card opens that card's Sheet in the SideSheet.
- The card gets an accent outline and keeps running, so changes are heard and seen live.
- Only one sheet is open at a time; opening another replaces it. Esc or ✕ closes it.
- Under 768px it's a bottom sheet with the card still visible above it.

### 6.5 Fretboard/Piano view

- It remains the single shared `viewMode` in the existing store.
- The switch appears on the **faces** of the cards that render it (Fretboard, Harmony). Both write the same state.

### 6.6 Phone (<768px)

- The top bar becomes compact (logo mark plus nav).
- The dock stays pinned at the bottom.
- Side sheets and dock pop-ups become bottom sheets.
- Cards stack full width in workspace order.

## 7. Card framework

### 7.1 Registry

`src/v2/cards/registry.ts`:

```ts
interface CardDef {
  id: string;                        // stable; stored in workspaces
  title: string;
  description: string;               // one line, for the Add card picker
  size: { colSpan: 3 | 4 | 6 | 12; rowSpan: number };
  follows: Array<'key' | 'tempo'>;   // drives the "follows …" chip
  Face: React.FC;                    // most-used controls; reads/writes shared state
  Sheet?: React.FC;                  // everything else
}
```

- Grid, workspaces, picker and side sheet all read from the registry.
- Unknown ids in saved workspaces are dropped silently on load.

### 7.2 Card anatomy

- **Header:** the drag handle area, the title (uppercase 10–11px, muted), the "follows" chip, ⚙ (if there's a Sheet), and ⋯ (Remove, Move to workspace…).
- **Face:** one hero visual (circle, neck, staff, beat dots, big number) plus the card's main action. Controls sit in a consistent place (below the hero).
- **Sheet:** grouped, labeled settings. Changes apply live.

### 7.3 Card list and review loop

Card faces are designed one at a time:

1. browser mockup of the face and sheet
2. approval
3. build
4. check in the app

Face and sheet contents below are the starting proposal; each gets confirmed at its review. The order puts the Warm-up workspace first so v2 is usable early.

| # | Card | Size | Face (proposal) | Sheet (proposal) |
|---|---|---|---|---|
| 1 | Metronome | small | Beat dots, BPM, ±1/±5, play | Time signature, subdivision, accent, sound, click volume |
| 2 | Scale | medium | Key and scale picker, notes with intervals, "next note in…" | Auto-advance mode and interval, randomize |
| 3 | Fretboard | full, tall | Full neck with scale and chord dots, Fretboard/Piano switch | Tuning (same shared `note.tuning` as app settings), fret count, labels (notes / intervals / none) |
| 4 | Circle of Fifths | medium, square | The circle; click a key to set it; chords or relatives | Major/minor emphasis, display options |
| 5 | Note Trainer (to be renamed) | medium | Current key big, next key, countdown | Direction, circle order or random, bars/beats/time, interval, count-in, show next |
| 6 | Chord | medium | Diatonic chords as buttons, the selected chord's notes | Triads/7ths, display options |
| 7 | Jam | medium | Current → next chords, bar countdown, play | Preset/infinite, progression, bars per chord, count-in, sound, pad settings, mixer |
| 8 | Timer | small | Big time, start/pause, reset | Count up/down, target |
| 9 | Harmony | full | The harmony builder | Default interval, voicing options |

This spec's build covers the framework and one reference card (Metronome) to prove the anatomy end-to-end. Cards 2–9 follow the loop and are tracked in the implementation plan.

## 8. Learn and Read placeholders (in this build)

- **`/v2/learn`:** the Learn home layout (a "Continue" card, chapter list with read markers) and the article template:
  - reading column
  - table of contents on desktop
  - previous/next links
  - a "Try it in Practice" button that sets shared key/tempo and switches to a workspace
  - an article block schema (heading, paragraph, callout, example, try-it) with **one sample article** to prove the template
- **`/v2/read`:** routed. It shows the existing sight-reading experience inside the v2 shell until its own rebuild spec.

## 9. Testing

- **Tokens:**
  - a unit test parses the token table and asserts WCAG AA contrast for every text/background pair in both modes
  - a test asserts no raw hex colors appear in `src/v2/**/*.module.css`, only `var(--…)`
- **Brand:** a test asserts `BRAND.name`'s literal appears in no `src/v2` file other than `brand.ts`.
- **v2 store:**
  - workspace add, rename, duplicate, remove, reorder, reset
  - card add, remove, move
  - single-level undo
  - `persist` round-trip
  - unknown card ids dropped
- **Components:** keyboard behavior for SegmentedControl, Slider, Stepper, Tabs, SideSheet (focus stays inside, Esc) and Popover (Esc, outside click).
- **Tap tempo:** the averaging, reset and clamp logic as a pure function.
- **Grid:** span clamping per breakpoint as a pure function.
- **Manual (browser):** both theme modes, the phone width, dock pop-ups, the side sheet, drag reorder, and the reference Metronome card running against the transport.

## 10. Out of scope (later specs)

- **Card faces 2–9:** designed through the per-card loop (§7.3), each with its own mini review. No separate spec unless one grows.
- **Learn content and curriculum:** its own spec. Starting chapter proposal "Foundations":
  - notes and the fretboard
  - intervals
  - the major scale
  - keys and key signatures
  - the circle of fifths
  - triads
  - chords in a key
  - common progressions
  - minor and modes
  - rhythm basics
  - reading notation

  The detail will be worked out as we go. Quizzes and streaks come later, via new block types.
- **Read page rebuild:** in v2 components, same modes and features.
- **Persisting shared engine state** (key, tempo) across reloads.
- **Retiring v1:** moving v2 to `/` and deleting v1 code, once parity is reached.
- **Renaming the brand:** a change to `brand.ts` only.
