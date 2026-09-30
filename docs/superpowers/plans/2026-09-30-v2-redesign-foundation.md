# v2 Redesign Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up v2 at `/v2`: brand config, design tokens (dark/light), component kit, persisted v2 store (workspaces, theme, Learn progress), app shell (top bar and docked player bar with quick pop-ups, tap tempo and shortcuts), Practice page (workspace tabs, add-card picker, dense grid, drag reorder, side sheet), card registry with the Metronome reference card, the Learn home and article template, and the Read route.

**Architecture:**
- v2 is a lazy-loaded route tree in `src/v2/`, isolated from v1 CSS by CSS Modules under a `.gp2` root.
- It reuses the existing shared store (`src/store/useStore.ts`) and audio engine (`src/audio/*`, including the transport) unchanged.
- v2-only UI state lives in its own persisted zustand store.
- Cards are registry entries (Face plus optional Sheet) rendered by a dense 12/8/1-column grid.

**Tech Stack:** React 19, TypeScript 4.9, CRA (react-scripts, Jest + Testing Library), zustand 5 (+ `persist`), react-router-dom 7, @dnd-kit, `lucide-react`, `@fontsource/*`.

**Spec:** `docs/superpowers/specs/2026-09-30-v2-redesign-design.md`

## Global Constraints

- **No git commits without the user's explicit permission in the current turn** (standing user rule). Every "Checkpoint" step means: stop, report, and ask whether to commit.
- **Location:** all new code is in `src/v2/`. v2 must not import from `src/components`, `src/layouts`, `src/pages` or `src/ui`, except:
  - `components/Fretboard`, `components/PianoKeyboard`, `components/GrandStaff`, `components/MelodyStaff`, `components/NoteReading/AnswerPiano`
  - `components/NoteReading` (Read route only, spec §8)
- **Styling:**
  - Component styles are CSS Modules (`*.module.css`) using only `var(--…)` colors. No raw hex/rgb in `src/v2/**/*.module.css`.
  - Global v2 CSS files (`base.css`, `legacyBridge.css`) scope every selector under `.gp2`.
- **Brand:** the literal brand name appears only in `src/v2/brand.ts`. Everything else reads `BRAND.name`.
- **Signature gradient** `linear-gradient(135deg, #ff3d7f, #a347ff 58%, #3d8bff)` only on:
  - the logo mark
  - the main play/stop button
  - active slider fill
  - selected state of primary toggles
- **Grid:** 12 columns at ≥1200px, 8 columns from 768px to 1199px, 1 column below 768px. Row unit 40px, gap 12px.
- **Keyboard shortcuts** (ignored when focus is in input/textarea/select/contenteditable or a modifier is held):
  - Space = play/stop
  - ↑/↓ = BPM ±1, and Shift+↑/↓ = ±5
  - K = key pop-up
- **BPM** is clamped to 40–300 everywhere in v2.
- **Tap tempo:**
  - BPM = 60 / (average of the last up to 4 tap intervals)
  - a gap ≥ 2000ms resets
  - clamped to 40–300
- **Accessibility:**
  - Text contrast ≥ 4.5:1, and UI glyphs/indicators (accent, success, danger, warning) ≥ 3:1, in both modes.
  - Every control is keyboard-operable with a visible focus ring.
- **Sentence-case labels.** Uppercase letter-spaced text is only for card titles.
- **Deviations from spec, decided during planning:**
  - Tokens live in `src/v2/styles/tokens.ts` (typed; generates the CSS) rather than `tokens.css`, so JS consumers and the contrast test share one source.
  - Dark `--text-muted` is `#938da0`, light `--text-muted` is `#6a6379`, and light `--warning` is `#9a5c00`, to pass contrast on `--fill`.
  - Workspace card ids not in the registry are **hidden at render but kept in storage**, rather than dropped on load. Otherwise built-in workspaces would lose cards that haven't been rebuilt yet.

## Review Focus

These are the conditions most likely to bite a real user, and the task that tests each:

1. **Stale saved state:** a `localStorage` entry from an older build (unknown card ids, missing fields, corrupt JSON) must load without crashing, falling back to defaults field by field. Tested in Task 3.
2. **Deleting the last workspace, or the active one:** there must always be at least one workspace and a valid `activeWorkspaceId`. Built-ins can't be deleted. Tested in Task 3.
3. **Shortcuts while typing:** Space in the rename field or article search must not start the metronome, and ↑/↓ in a slider must not double-change BPM. Tested in Task 8.
4. **Rapid or odd tap-tempo input:** a single tap, taps more than 2s apart, and absurdly fast taps must never produce NaN/Infinity or out-of-range BPM. Tested in Task 8.
5. **Side sheet for a removed card:** removing a card, switching workspace or undoing while its sheet is open must close the sheet, not render a stale or undefined card. Tested in Task 10.

---

## File Structure

```
src/v2/
  brand.ts                      # BRAND config (only place the name lives)
  V2App.tsx                     # /v2 route tree (lazy-loaded from src/App.tsx)
  styles/
    tokens.ts                   # THEMES, contrast pairs, tokensToCss()
    base.css                    # .gp2 reset, fonts, type scale, focus ring
    legacyBridge.css            # .gp2 overrides of --ds-* / reused-component vars
  theme/
    ThemeRoot.tsx               # .gp2 root, data-theme, token <style>, body bg
    useResolvedTheme.ts         # 'system' → 'dark'|'light'
  state/
    useV2Store.ts               # persisted workspaces/theme/learn + non-persisted ui
    builtInWorkspaces.ts        # the four built-ins
  ui/                           # component kit (one file + module.css each)
    Button.tsx IconButton.tsx Chip.tsx SegmentedControl.tsx Switch.tsx
    Stepper.tsx Slider.tsx Picker.tsx Tabs.tsx Popover.tsx SideSheet.tsx
    Dialog.tsx Toast.tsx Tooltip.tsx LogoMark.tsx index.ts  (+ *.module.css)
  shell/
    V2Layout.tsx                # top bar + <Outlet/> + dock + sheet/toast hosts
    TopBar.tsx SettingsSheet.tsx ToastHost.tsx
    dock/Dock.tsx KeyPopover.tsx TempoPopover.tsx MeterPopover.tsx
    dock/tapTempo.ts            # pure tap-tempo reducer
    useShortcuts.ts             # global keyboard shortcuts
  cards/
    registry.ts                 # CardDef[] + getCard()
    grid.ts                     # columnsForWidth(), clampSpan()
    CardFrame.tsx               # card anatomy (header / face)
    CardSheetHost.tsx           # renders the open card's Sheet in SideSheet
    metronome/MetronomeFace.tsx metronome/MetronomeSheet.tsx
  pages/
    PracticePage.tsx WorkspaceTabs.tsx CardGrid.tsx AddCardDialog.tsx
    KitPage.tsx ReadPage.tsx
  learn/
    types.ts articles/index.ts articles/major-scale.ts
    LearnHome.tsx ArticlePage.tsx blocks/BlockRenderer.tsx
  __tests__/
    tokens.test.ts brand.test.ts styleHygiene.test.ts
```

Modified outside `src/v2/`:

- `src/App.tsx`: adds the `/v2/*` route.
- `package.json`: new deps.
- `src/components/Fretboard/Fretboard.css`, `src/components/PianoKeyboard/PianoKeyboard.css`, `src/components/MelodyStaff/MelodyStaff.css`: token fallbacks.

---

### Task 1: Brand, tokens and hygiene tests

**Files:**
- Create: `src/v2/brand.ts`
- Create: `src/v2/styles/tokens.ts`
- Create: `src/v2/__tests__/tokens.test.ts`
- Create: `src/v2/__tests__/brand.test.ts`
- Create: `src/v2/__tests__/styleHygiene.test.ts`

**Interfaces:**
- Produces:
  - `BRAND: { name: string; tagline: string }`
  - `type ThemeName = 'dark' | 'light'`
  - `type TokenName` (union of the keys below)
  - `THEMES: Record<ThemeName, Record<TokenName, string>>`
  - `SHARED_TOKENS: Record<string, string>` (non-color tokens)
  - `CONTRAST_PAIRS: Array<{ fg: TokenName | '#ffffff'; bg: TokenName; min: 4.5 | 3 }>`
  - `contrastRatio(a: string, b: string): number`
  - `tokensToCss(): string`

- [ ] **Step 1: Write the failing tests**

`src/v2/__tests__/tokens.test.ts`:
```ts
import { THEMES, CONTRAST_PAIRS, contrastRatio, tokensToCss } from '../styles/tokens';

describe('design tokens', () => {
  (['dark', 'light'] as const).forEach(mode => {
    it(`${mode}: every contrast pair meets its minimum`, () => {
      const t = THEMES[mode];
      const failures = CONTRAST_PAIRS
        .map(p => {
          const fg = p.fg === '#ffffff' ? '#ffffff' : t[p.fg];
          const ratio = contrastRatio(fg, t[p.bg]);
          return { ...p, ratio };
        })
        .filter(p => p.ratio < p.min);
      expect(failures).toEqual([]);
    });
  });

  it('both themes define the same token names', () => {
    expect(Object.keys(THEMES.light).sort()).toEqual(Object.keys(THEMES.dark).sort());
  });

  it('computes known contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('emits css scoped to .gp2 for both themes', () => {
    const css = tokensToCss();
    expect(css).toContain(".gp2[data-theme='dark']");
    expect(css).toContain(".gp2[data-theme='light']");
    expect(css).toContain('--accent: #ff3d7f;');
    expect(css).toContain('--gradient-signature:');
  });
});
```

`src/v2/__tests__/brand.test.ts`:
```ts
import fs from 'fs';
import path from 'path';
import { BRAND } from '../brand';

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);

it('the brand name literal only appears in brand.ts', () => {
  const root = path.join(__dirname, '..');
  const offenders = walk(root)
    .filter(f => /\.(tsx?|css)$/.test(f))
    .filter(f => !f.endsWith(`${path.sep}brand.ts`) && !f.includes('__tests__'))
    .filter(f => fs.readFileSync(f, 'utf8').includes(BRAND.name));
  expect(offenders).toEqual([]);
});
```

`src/v2/__tests__/styleHygiene.test.ts`:
```ts
import fs from 'fs';
import path from 'path';

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);

it('v2 CSS modules use tokens, not raw colors', () => {
  const root = path.join(__dirname, '..');
  const offenders = walk(root)
    .filter(f => f.endsWith('.module.css'))
    .flatMap(f => {
      const src = fs.readFileSync(f, 'utf8');
      const hits = src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? [];
      return hits.map(h => `${path.relative(root, f)}: ${h}`);
    });
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/v2`
Expected: FAIL with "Cannot find module '../styles/tokens'" and "'../brand'".

- [ ] **Step 3: Implement**

`src/v2/brand.ts`:
```ts
// The only place the product's name lives. Rename the app by editing here.
export const BRAND = {
  name: 'Guitar Practice',
  tagline: 'Practice with intent.',
} as const;
```

`src/v2/styles/tokens.ts`:
```ts
// Single source of truth for v2 design tokens. tokensToCss() emits the CSS
// custom properties that every v2 component reads; JS consumers (e.g. canvas
// or VexFlow colors) and the contrast test read THEMES directly.

export type ThemeName = 'dark' | 'light';

const dark = {
  'bg': '#14121a',
  'surface': '#1b1822',
  'surface-raised': '#221e2b',
  'fill': '#26222f',
  'line': '#2b2735',
  'line-strong': '#3a3446',
  'text': '#ece9f2',
  'text-muted': '#938da0',
  'text-inverse': '#14121a',
  'accent': '#ff3d7f',
  'success': '#3ecf8e',
  'danger': '#ff5c5c',
  'warning': '#ffb547',
  'note-root': '#ff3d7f',
  'note-scale': '#a347ff',
  'note-chord': '#3d8bff',
  'note-muted': '#3a3446',
  'note-label': '#ffffff',
  'overlay': '#07060acc',
};

export type TokenName = keyof typeof dark;

const light: Record<TokenName, string> = {
  'bg': '#f6f4f9',
  'surface': '#ffffff',
  'surface-raised': '#ffffff',
  'fill': '#efebf5',
  'line': '#e4dfec',
  'line-strong': '#d4cde0',
  'text': '#1c1824',
  'text-muted': '#6a6379',
  'text-inverse': '#ffffff',
  'accent': '#e5256a',
  'success': '#148a57',
  'danger': '#d0343a',
  'warning': '#9a5c00',
  'note-root': '#e5256a',
  'note-scale': '#7c3aed',
  'note-chord': '#2563eb',
  'note-muted': '#d4cde0',
  'note-label': '#ffffff',
  'overlay': '#1c182466',
};

export const THEMES: Record<ThemeName, Record<TokenName, string>> = { dark, light };

/** Non-color tokens, identical in both themes. */
export const SHARED_TOKENS: Record<string, string> = {
  'gradient-signature': 'linear-gradient(135deg, #ff3d7f, #a347ff 58%, #3d8bff)',
  'font-display': "'Space Grotesk', system-ui, sans-serif",
  'font-ui': "'Inter', system-ui, sans-serif",
  'font-mono': "'JetBrains Mono', ui-monospace, monospace",
  'text-11': '11px', 'text-12': '12px', 'text-14': '14px', 'text-16': '16px',
  'text-20': '20px', 'text-24': '24px', 'text-32': '32px', 'text-48': '48px',
  'space-1': '4px', 'space-2': '8px', 'space-3': '12px', 'space-4': '16px',
  'space-5': '20px', 'space-6': '24px', 'space-8': '32px', 'space-10': '40px',
  'radius-sm': '6px', 'radius-md': '10px', 'radius-lg': '14px', 'radius-pill': '999px',
  'dur-fast': '120ms', 'dur-base': '200ms', 'ease': 'cubic-bezier(0.2, 0, 0, 1)',
  'row-unit': '40px', 'grid-gap': '12px',
};

const THEME_ONLY: Record<ThemeName, Record<string, string>> = {
  dark: {
    'elev-1': '0 1px 0 #00000040',
    'elev-2': '0 8px 24px #00000059',
    'elev-3': '0 18px 40px #00000080',
    'focus-ring': '0 0 0 3px #ff3d7f59',
  },
  light: {
    'elev-1': '0 1px 2px #1c182414',
    'elev-2': '0 8px 24px #1c18241f',
    'elev-3': '0 18px 40px #28144624',
    'focus-ring': '0 0 0 3px #e5256a4d',
  },
};

export const CONTRAST_PAIRS: Array<{ fg: TokenName | '#ffffff'; bg: TokenName; min: 4.5 | 3 }> = [
  ...(['bg', 'surface', 'surface-raised', 'fill'] as TokenName[]).flatMap(bg => [
    { fg: 'text' as const, bg, min: 4.5 as const },
    { fg: 'text-muted' as const, bg, min: 4.5 as const },
  ]),
  { fg: 'text-inverse', bg: 'text', min: 4.5 },
  { fg: '#ffffff', bg: 'accent', min: 3 },
  { fg: 'accent', bg: 'surface', min: 3 },
  { fg: 'success', bg: 'surface', min: 3 },
  { fg: 'danger', bg: 'surface', min: 3 },
  { fg: 'warning', bg: 'surface', min: 3 },
  { fg: 'note-label', bg: 'note-root', min: 3 },
];

const luminance = (hex: string): number => {
  const h = hex.replace('#', '').slice(0, 6);
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const block = (selector: string, vars: Record<string, string>): string =>
  `${selector} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join('\n')}\n}`;

export const tokensToCss = (): string =>
  [
    block('.gp2', SHARED_TOKENS),
    ...(['dark', 'light'] as ThemeName[]).map(mode =>
      block(`.gp2[data-theme='${mode}']`, { ...THEMES[mode], ...THEME_ONLY[mode] })),
  ].join('\n\n');
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `CI=true npx react-scripts test --watchAll=false src/v2`
Expected: PASS (6 tests). `styleHygiene` passes trivially because no modules exist yet.

- [ ] **Step 5: Checkpoint.** Report and ask the user whether to commit (`feat(v2): brand config, design tokens, hygiene tests`).

---

### Task 2: v2 route skeleton, ThemeRoot, fonts and base CSS

**Files:**
- Modify: `package.json` (deps)
- Modify: `src/App.tsx`
- Create: `src/v2/V2App.tsx`
- Create: `src/v2/theme/ThemeRoot.tsx`
- Create: `src/v2/theme/useResolvedTheme.ts`
- Create: `src/v2/styles/base.css`
- Test: `src/v2/theme/ThemeRoot.test.tsx`

**Interfaces:**
- Consumes: `tokensToCss`, `THEMES`, `ThemeName` (Task 1).
- Produces:
  - `<ThemeRoot mode="dark"|"light"|"system">children</ThemeRoot>` renders `<div class="gp2" data-theme=…>`
  - `useResolvedTheme(mode): ThemeName`
  - default export `V2App` (route element for `/v2/*`)

- [ ] **Step 1: Install dependencies**

Run: `npm install lucide-react @fontsource/inter @fontsource/space-grotesk @fontsource/jetbrains-mono`
Expected: added to `dependencies`. No peer-dependency errors.

- [ ] **Step 2: Write the failing test**

`src/v2/theme/ThemeRoot.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeRoot } from './ThemeRoot';

const mockMatchMedia = (dark: boolean) => {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: dark, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  }));
};

it('applies the explicit theme and restores body styles on unmount', () => {
  mockMatchMedia(false);
  document.body.style.background = 'red';
  const { unmount } = render(<ThemeRoot mode="dark"><p>hi</p></ThemeRoot>);
  const root = screen.getByText('hi').closest('.gp2');
  expect(root).toHaveAttribute('data-theme', 'dark');
  expect(document.getElementById('gp2-tokens')).not.toBeNull();
  unmount();
  expect(document.body.style.background).toBe('red');
});

it('resolves system mode from prefers-color-scheme', () => {
  mockMatchMedia(true);
  render(<ThemeRoot mode="system"><p>sys</p></ThemeRoot>);
  expect(screen.getByText('sys').closest('.gp2')).toHaveAttribute('data-theme', 'dark');
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/theme`
Expected: FAIL with "Cannot find module './ThemeRoot'".

- [ ] **Step 4: Implement**

`src/v2/theme/useResolvedTheme.ts`:
```ts
import { useEffect, useState } from 'react';
import type { ThemeName } from '../styles/tokens';

const query = '(prefers-color-scheme: dark)';

export const useResolvedTheme = (mode: ThemeName | 'system'): ThemeName => {
  const [systemDark, setSystemDark] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);
  if (mode === 'system') return systemDark ? 'dark' : 'light';
  return mode;
};
```

`src/v2/theme/ThemeRoot.tsx`:
```tsx
import React, { useEffect } from 'react';
import { THEMES, tokensToCss, ThemeName } from '../styles/tokens';
import { useResolvedTheme } from './useResolvedTheme';
import '../styles/base.css';

const STYLE_ID = 'gp2-tokens';

const ensureTokenStyle = () => {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = tokensToCss();
  document.head.appendChild(el);
};

/** The v2 root: token CSS, data-theme, and the page background. v1's global
 *  body styles are overridden while mounted and restored on unmount. */
export const ThemeRoot: React.FC<{ mode: ThemeName | 'system'; children: React.ReactNode }> = ({
  mode, children,
}) => {
  const theme = useResolvedTheme(mode);
  ensureTokenStyle();

  useEffect(() => {
    const prev = { background: document.body.style.background, color: document.body.style.color };
    document.body.style.background = THEMES[theme].bg;
    document.body.style.color = THEMES[theme].text;
    return () => {
      document.body.style.background = prev.background;
      document.body.style.color = prev.color;
    };
  }, [theme]);

  return <div className="gp2" data-theme={theme}>{children}</div>;
};
```

`src/v2/styles/base.css`:
```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
@import '@fontsource/space-grotesk/500.css';
@import '@fontsource/space-grotesk/700.css';
@import '@fontsource/jetbrains-mono/500.css';
@import '@fontsource/jetbrains-mono/700.css';

/* Everything is scoped under .gp2 so v1's global CSS can't collide. */
.gp2 {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--text-14);
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
.gp2 *, .gp2 *::before, .gp2 *::after { box-sizing: border-box; }
.gp2 h1, .gp2 h2, .gp2 h3, .gp2 h4, .gp2 p { margin: 0; }
.gp2 h1, .gp2 h2, .gp2 h3 { font-family: var(--font-display); font-weight: 700; }
.gp2 button { font: inherit; color: inherit; }
.gp2 a { color: inherit; }
.gp2 :focus-visible { outline: none; box-shadow: var(--focus-ring); border-radius: var(--radius-sm); }
@media (prefers-reduced-motion: reduce) {
  .gp2 *, .gp2 *::before, .gp2 *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

`src/v2/V2App.tsx` (skeleton; Tasks 7–14 fill in real pages):
```tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeRoot } from './theme/ThemeRoot';

const V2App: React.FC = () => (
  <ThemeRoot mode="dark">
    <Routes>
      <Route index element={<main style={{ padding: 24 }}>v2 practice</main>} />
    </Routes>
  </ThemeRoot>
);

export default V2App;
```

`src/App.tsx`: add a lazy import and a route **before** the `AppShell` route:
```tsx
const V2App = React.lazy(() => import('./v2/V2App'));
// ...inside <Routes>:
<Route path="/v2/*" element={<React.Suspense fallback={null}><V2App /></React.Suspense>} />
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `CI=true npx react-scripts test --watchAll=false src/v2 && npx tsc --noEmit -p .`
Expected: PASS, no type errors.

- [ ] **Step 6: Manual check.** Open `http://localhost:3001/v2` (the dev server runs on 3001).
  - Expected: a dark page reading "v2 practice" in Inter.
  - `/` still shows v1 unchanged.

- [ ] **Step 7: Checkpoint.** Ask whether to commit (`feat(v2): route skeleton, ThemeRoot, fonts`).

---

### Task 3: v2 store (workspaces, theme, Learn progress, undo, persistence)

**Files:**
- Create: `src/v2/state/builtInWorkspaces.ts`
- Create: `src/v2/state/useV2Store.ts`
- Test: `src/v2/state/useV2Store.test.ts`

**Interfaces:**
- Produces:
```ts
export interface Workspace { id: string; name: string; builtIn: boolean; cards: string[] }
export type ThemeMode = 'dark' | 'light' | 'system';
export type Overlay =
  | { kind: 'cardSheet'; cardId: string }
  | { kind: 'settings' }
  | { kind: 'popover'; id: 'key' | 'tempo' | 'meter' }
  | null;
export interface V2State {
  themeMode: ThemeMode;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  learnProgress: Record<string, { readAt: number }>;
  // non-persisted UI
  overlay: Overlay;
  toast: { message: string; undoable: boolean } | null;
  undoSnapshot: { workspaces: Workspace[]; activeWorkspaceId: string } | null;
  // actions
  setThemeMode(m: ThemeMode): void;
  setActiveWorkspace(id: string): void;
  addWorkspace(name?: string): string;
  renameWorkspace(id: string, name: string): void;
  duplicateWorkspace(id: string): string;
  removeWorkspace(id: string): void;
  reorderWorkspaces(from: number, to: number): void;
  resetWorkspace(id: string): void;
  addCard(workspaceId: string, cardId: string): void;
  removeCard(workspaceId: string, cardId: string): void;
  moveCard(workspaceId: string, from: number, to: number): void;
  moveCardToWorkspace(cardId: string, fromId: string, toId: string): void;
  undo(): void;
  markRead(slug: string): void;
  setOverlay(o: Overlay): void;
  dismissToast(): void;
}
export const useV2Store: UseBoundStore<StoreApi<V2State>>;
export const BUILT_IN_WORKSPACES: Workspace[];
export const V2_STORAGE_KEY = 'gp2';
```

- [ ] **Step 1: Write the failing tests**

`src/v2/state/useV2Store.test.ts`:
```ts
import { act } from '@testing-library/react';
import { useV2Store, V2_STORAGE_KEY, mergePersisted } from './useV2Store';
import { BUILT_IN_WORKSPACES } from './builtInWorkspaces';

const s = () => useV2Store.getState();
const reset = () => act(() => useV2Store.setState(useV2Store.getInitialState(), true));

beforeEach(() => { localStorage.clear(); reset(); });

describe('workspaces', () => {
  it('starts with the four built-ins and Warm-up active', () => {
    expect(s().workspaces.map(w => w.name)).toEqual(['Warm-up', 'Theory', 'Harmony', 'Jam']);
    expect(s().activeWorkspaceId).toBe('warm-up');
  });

  it('adds, renames, duplicates and reorders', () => {
    let id = '';
    act(() => { id = s().addWorkspace('Scales'); });
    expect(s().workspaces.at(-1)).toMatchObject({ id, name: 'Scales', builtIn: false, cards: [] });
    act(() => s().renameWorkspace(id, 'Scales warm-up'));
    expect(s().workspaces.find(w => w.id === id)!.name).toBe('Scales warm-up');
    let dup = '';
    act(() => { dup = s().duplicateWorkspace('theory'); });
    const copy = s().workspaces.find(w => w.id === dup)!;
    expect(copy).toMatchObject({ name: 'Theory copy', builtIn: false });
    expect(copy.cards).toEqual(BUILT_IN_WORKSPACES[1].cards);
    act(() => s().reorderWorkspaces(0, 1));
    expect(s().workspaces[1].id).toBe('warm-up');
  });

  it('ignores blank renames', () => {
    act(() => s().renameWorkspace('theory', '   '));
    expect(s().workspaces.find(w => w.id === 'theory')!.name).toBe('Theory');
  });

  it('never removes built-ins; removing the active custom one activates a neighbor, and undo restores it', () => {
    act(() => s().removeWorkspace('warm-up'));
    expect(s().workspaces).toHaveLength(4);
    let id = '';
    act(() => { id = s().addWorkspace('Temp'); s().setActiveWorkspace(id); });
    act(() => s().removeWorkspace(id));
    expect(s().workspaces.find(w => w.id === id)).toBeUndefined();
    expect(s().workspaces.some(w => w.id === s().activeWorkspaceId)).toBe(true);
    expect(s().toast).toMatchObject({ undoable: true });
    act(() => s().undo());
    expect(s().workspaces.find(w => w.id === id)).toBeDefined();
    expect(s().activeWorkspaceId).toBe(id);
    expect(s().toast).toBeNull();
  });

  it('resets a built-in to its default cards', () => {
    act(() => s().removeCard('warm-up', 'metronome'));
    act(() => s().resetWorkspace('warm-up'));
    expect(s().workspaces[0].cards).toEqual(BUILT_IN_WORKSPACES[0].cards);
  });
});

describe('cards', () => {
  it('adds without duplicates, removes with undo, moves within and across workspaces', () => {
    act(() => s().addCard('jam', 'metronome'));
    act(() => s().addCard('jam', 'metronome'));
    expect(s().workspaces.find(w => w.id === 'jam')!.cards.filter(c => c === 'metronome')).toHaveLength(1);

    act(() => s().removeCard('warm-up', 'metronome'));
    expect(s().workspaces[0].cards).not.toContain('metronome');
    act(() => s().undo());
    expect(s().workspaces[0].cards[0]).toBe('metronome');

    act(() => s().moveCard('warm-up', 0, 2));
    expect(s().workspaces[0].cards[2]).toBe('metronome');

    act(() => s().moveCardToWorkspace('timer', 'warm-up', 'theory'));
    expect(s().workspaces[0].cards).not.toContain('timer');
    expect(s().workspaces.find(w => w.id === 'theory')!.cards.at(-1)).toBe('timer');
  });

  it('closes an open card sheet when that card is removed', () => {
    act(() => s().setOverlay({ kind: 'cardSheet', cardId: 'metronome' }));
    act(() => s().removeCard('warm-up', 'metronome'));
    expect(s().overlay).toBeNull();
  });
});

describe('persistence', () => {
  it('persists workspaces, theme and progress but not ui state', () => {
    act(() => { s().setThemeMode('light'); s().markRead('major-scale'); s().setOverlay({ kind: 'settings' }); });
    const saved = JSON.parse(localStorage.getItem(V2_STORAGE_KEY)!).state;
    expect(saved.themeMode).toBe('light');
    expect(saved.learnProgress['major-scale'].readAt).toEqual(expect.any(Number));
    expect(saved.overlay).toBeUndefined();
    expect(saved.toast).toBeUndefined();
  });

  it('merges stale or partial saved state field by field', () => {
    const merged = mergePersisted(
      { themeMode: 'neon', workspaces: [{ id: 'x', name: 'Mine', builtIn: false, cards: ['metronome', 42] }], activeWorkspaceId: 'gone' },
      useV2Store.getInitialState(),
    );
    expect(merged.themeMode).toBe('dark');
    expect(merged.workspaces.map(w => w.id)).toEqual(['warm-up', 'theory', 'harmony', 'jam', 'x']);
    expect(merged.workspaces.find(w => w.id === 'x')!.cards).toEqual(['metronome']);
    expect(merged.activeWorkspaceId).toBe('warm-up');
  });

  it('survives corrupt persisted JSON', () => {
    expect(mergePersisted('garbage', useV2Store.getInitialState()).workspaces).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/state`
Expected: FAIL with "Cannot find module './useV2Store'".

- [ ] **Step 3: Implement**

`src/v2/state/builtInWorkspaces.ts`:
```ts
import type { Workspace } from './useV2Store';

// Card ids refer to src/v2/cards/registry.ts. Ids not yet in the registry
// are kept here and hidden at render until their card is rebuilt.
export const BUILT_IN_WORKSPACES: Workspace[] = [
  { id: 'warm-up', name: 'Warm-up', builtIn: true, cards: ['metronome', 'timer', 'scale', 'fretboard'] },
  { id: 'theory', name: 'Theory', builtIn: true, cards: ['scale', 'circle-of-fifths', 'chord', 'fretboard'] },
  { id: 'harmony', name: 'Harmony', builtIn: true, cards: ['scale', 'harmony', 'fretboard'] },
  { id: 'jam', name: 'Jam', builtIn: true, cards: ['jam', 'scale', 'fretboard'] },
];
```

`src/v2/state/useV2Store.ts`:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BUILT_IN_WORKSPACES } from './builtInWorkspaces';

export interface Workspace { id: string; name: string; builtIn: boolean; cards: string[] }
export type ThemeMode = 'dark' | 'light' | 'system';
export type Overlay =
  | { kind: 'cardSheet'; cardId: string }
  | { kind: 'settings' }
  | { kind: 'popover'; id: 'key' | 'tempo' | 'meter' }
  | null;

interface Persisted {
  themeMode: ThemeMode;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  learnProgress: Record<string, { readAt: number }>;
}

export interface V2State extends Persisted {
  overlay: Overlay;
  toast: { message: string; undoable: boolean } | null;
  undoSnapshot: { workspaces: Workspace[]; activeWorkspaceId: string } | null;
  setThemeMode(m: ThemeMode): void;
  setActiveWorkspace(id: string): void;
  addWorkspace(name?: string): string;
  renameWorkspace(id: string, name: string): void;
  duplicateWorkspace(id: string): string;
  removeWorkspace(id: string): void;
  reorderWorkspaces(from: number, to: number): void;
  resetWorkspace(id: string): void;
  addCard(workspaceId: string, cardId: string): void;
  removeCard(workspaceId: string, cardId: string): void;
  moveCard(workspaceId: string, from: number, to: number): void;
  moveCardToWorkspace(cardId: string, fromId: string, toId: string): void;
  undo(): void;
  markRead(slug: string): void;
  setOverlay(o: Overlay): void;
  dismissToast(): void;
}

export const V2_STORAGE_KEY = 'gp2';

const cloneBuiltIns = (): Workspace[] => BUILT_IN_WORKSPACES.map(w => ({ ...w, cards: [...w.cards] }));

const newId = (): string => `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const THEME_MODES: ThemeMode[] = ['dark', 'light', 'system'];

/** Merge persisted state from any older build into current defaults, field by
 *  field. Anything malformed falls back to the default for that field. */
export const mergePersisted = (persisted: unknown, current: V2State): V2State => {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<Persisted>;
  const themeMode = THEME_MODES.includes(p.themeMode as ThemeMode) ? (p.themeMode as ThemeMode) : current.themeMode;

  const saved = Array.isArray(p.workspaces) ? p.workspaces : [];
  const valid = saved
    .filter((w): w is Workspace => !!w && typeof w.id === 'string' && typeof w.name === 'string')
    .map(w => ({
      id: w.id,
      name: w.name,
      builtIn: BUILT_IN_WORKSPACES.some(b => b.id === w.id),
      cards: Array.isArray(w.cards) ? w.cards.filter((c): c is string => typeof c === 'string') : [],
    }));
  // Built-ins always exist (saved versions win); customs follow in saved order.
  const builtIns = cloneBuiltIns().map(b => valid.find(v => v.id === b.id) ?? b);
  const customs = valid.filter(v => !v.builtIn);
  const workspaces = [...builtIns, ...customs];

  const activeWorkspaceId = workspaces.some(w => w.id === p.activeWorkspaceId)
    ? (p.activeWorkspaceId as string)
    : workspaces[0].id;

  const learnProgress = p.learnProgress && typeof p.learnProgress === 'object' ? p.learnProgress : {};

  return { ...current, themeMode, workspaces, activeWorkspaceId, learnProgress };
};

export const useV2Store = create<V2State>()(
  persist(
    (set, get) => {
      const snapshot = () => ({ workspaces: get().workspaces, activeWorkspaceId: get().activeWorkspaceId });
      const updateWs = (id: string, fn: (w: Workspace) => Workspace) =>
        set(s => ({ workspaces: s.workspaces.map(w => (w.id === id ? fn(w) : w)) }));

      return {
        themeMode: 'dark',
        workspaces: cloneBuiltIns(),
        activeWorkspaceId: BUILT_IN_WORKSPACES[0].id,
        learnProgress: {},
        overlay: null,
        toast: null,
        undoSnapshot: null,

        setThemeMode: themeMode => set({ themeMode }),

        setActiveWorkspace: id => {
          if (get().workspaces.some(w => w.id === id)) set({ activeWorkspaceId: id, overlay: null });
        },

        addWorkspace: (name = 'New workspace') => {
          const id = newId();
          set(s => ({ workspaces: [...s.workspaces, { id, name, builtIn: false, cards: [] }] }));
          return id;
        },

        renameWorkspace: (id, name) => {
          const trimmed = name.trim();
          if (trimmed) updateWs(id, w => ({ ...w, name: trimmed }));
        },

        duplicateWorkspace: id => {
          const src = get().workspaces.find(w => w.id === id);
          if (!src) return '';
          const copyId = newId();
          set(s => ({
            workspaces: [...s.workspaces, { id: copyId, name: `${src.name} copy`, builtIn: false, cards: [...src.cards] }],
          }));
          return copyId;
        },

        removeWorkspace: id => {
          const { workspaces, activeWorkspaceId } = get();
          const target = workspaces.find(w => w.id === id);
          if (!target || target.builtIn || workspaces.length <= 1) return;
          const idx = workspaces.indexOf(target);
          const rest = workspaces.filter(w => w.id !== id);
          const nextActive = activeWorkspaceId === id ? rest[Math.max(0, idx - 1)].id : activeWorkspaceId;
          set({
            undoSnapshot: snapshot(),
            workspaces: rest,
            activeWorkspaceId: nextActive,
            overlay: null,
            toast: { message: `Deleted "${target.name}"`, undoable: true },
          });
        },

        reorderWorkspaces: (from, to) => set(s => ({ workspaces: move(s.workspaces, from, to) })),

        resetWorkspace: id => {
          const def = BUILT_IN_WORKSPACES.find(b => b.id === id);
          if (def) updateWs(id, w => ({ ...w, name: def.name, cards: [...def.cards] }));
        },

        addCard: (workspaceId, cardId) =>
          updateWs(workspaceId, w => (w.cards.includes(cardId) ? w : { ...w, cards: [...w.cards, cardId] })),

        removeCard: (workspaceId, cardId) => {
          const ws = get().workspaces.find(w => w.id === workspaceId);
          if (!ws || !ws.cards.includes(cardId)) return;
          const overlay = get().overlay;
          set({
            undoSnapshot: snapshot(),
            toast: { message: 'Card removed', undoable: true },
            overlay: overlay?.kind === 'cardSheet' && overlay.cardId === cardId ? null : overlay,
          });
          updateWs(workspaceId, w => ({ ...w, cards: w.cards.filter(c => c !== cardId) }));
        },

        moveCard: (workspaceId, from, to) => updateWs(workspaceId, w => ({ ...w, cards: move(w.cards, from, to) })),

        moveCardToWorkspace: (cardId, fromId, toId) => {
          if (fromId === toId) return;
          updateWs(fromId, w => ({ ...w, cards: w.cards.filter(c => c !== cardId) }));
          updateWs(toId, w => (w.cards.includes(cardId) ? w : { ...w, cards: [...w.cards, cardId] }));
        },

        undo: () => {
          const snap = get().undoSnapshot;
          if (snap) set({ ...snap, undoSnapshot: null, toast: null, overlay: null });
        },

        markRead: slug => set(s => ({ learnProgress: { ...s.learnProgress, [slug]: { readAt: Date.now() } } })),

        setOverlay: overlay => set({ overlay }),

        dismissToast: () => set({ toast: null, undoSnapshot: null }),
      };
    },
    {
      name: V2_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        themeMode: s.themeMode,
        workspaces: s.workspaces,
        activeWorkspaceId: s.activeWorkspaceId,
        learnProgress: s.learnProgress,
      }),
      merge: (persisted, current) => mergePersisted(persisted, current),
    },
  ),
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/state`
Expected: PASS (10 tests).

- [ ] **Step 5: Checkpoint.** Ask whether to commit (`feat(v2): persisted workspace/theme/learn store with undo`).

---

### Task 4: Component kit, part A (controls)

**Files:**
- Create: `src/v2/ui/Button.tsx` + `Button.module.css`
- Create: `src/v2/ui/IconButton.tsx` + `IconButton.module.css`
- Create: `src/v2/ui/Chip.tsx` + `Chip.module.css`
- Create: `src/v2/ui/SegmentedControl.tsx` + `SegmentedControl.module.css`
- Create: `src/v2/ui/Switch.tsx` + `Switch.module.css`
- Create: `src/v2/ui/Stepper.tsx` + `Stepper.module.css`
- Create: `src/v2/ui/Slider.tsx` + `Slider.module.css`
- Create: `src/v2/ui/LogoMark.tsx` + `LogoMark.module.css`
- Create: `src/v2/ui/index.ts`
- Test: `src/v2/ui/controls.test.tsx`

**Interfaces:**
- Produces:
```ts
Button: React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'ghost'|'danger'; size?: 'sm'|'md' } & React.RefAttributes<HTMLButtonElement>>
IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: React.ReactNode; active?: boolean; size?: 'sm'|'md' }>
Chip: React.FC<{ children: React.ReactNode; active?: boolean; onClick?: () => void; title?: string }>
SegmentedControl: <T extends string>(p: { label: string; value: T; options: Array<{ value: T; label: React.ReactNode; title?: string }>; onChange(v: T): void; size?: 'sm'|'md' }) => JSX.Element
Switch: React.FC<{ label: string; checked: boolean; onChange(v: boolean): void }>
Stepper: React.FC<{ label: string; value: number; min: number; max: number; small?: number; big?: number; onChange(v: number): void; format?(v: number): React.ReactNode }>
Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange(v: number): void; showValue?: boolean; format?(v: number): string }>
LogoMark: React.FC<{ size?: number }>
```

- [ ] **Step 1: Write the failing tests**

`src/v2/ui/controls.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, SegmentedControl, Switch, Stepper, Slider, IconButton } from '.';

it('Button renders variant class and forwards clicks', () => {
  const onClick = jest.fn();
  render(<Button variant="primary" onClick={onClick}>Play</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(onClick).toHaveBeenCalled();
});

it('IconButton exposes its label to assistive tech', () => {
  render(<IconButton label="Settings" icon={<span>⚙</span>} />);
  expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
});

it('SegmentedControl is a radiogroup; arrow keys move the selection and wrap', () => {
  const onChange = jest.fn();
  render(
    <SegmentedControl label="Time" value="4" onChange={onChange}
      options={[{ value: '3', label: '3/4' }, { value: '4', label: '4/4' }, { value: '6', label: '6/8' }]} />,
  );
  const group = screen.getByRole('radiogroup', { name: 'Time' });
  expect(screen.getByRole('radio', { name: '4/4' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.keyDown(group, { key: 'ArrowRight' });
  expect(onChange).toHaveBeenLastCalledWith('6');
  fireEvent.keyDown(group, { key: 'ArrowLeft' });
  expect(onChange).toHaveBeenLastCalledWith('3');
  fireEvent.click(screen.getByRole('radio', { name: '6/8' }));
  expect(onChange).toHaveBeenLastCalledWith('6');
});

it('Switch toggles and reports state', () => {
  const onChange = jest.fn();
  render(<Switch label="Accent" checked={false} onChange={onChange} />);
  const sw = screen.getByRole('switch', { name: 'Accent' });
  expect(sw).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(sw);
  expect(onChange).toHaveBeenCalledWith(true);
});

it('Stepper clamps small and big steps to its range', () => {
  const onChange = jest.fn();
  render(<Stepper label="Tempo" value={298} min={40} max={300} small={1} big={5} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 5' }));
  expect(onChange).toHaveBeenLastCalledWith(300);
  fireEvent.click(screen.getByRole('button', { name: 'Decrease tempo by 1' }));
  expect(onChange).toHaveBeenLastCalledWith(297);
});

it('Slider is a labeled range input', () => {
  const onChange = jest.fn();
  render(<Slider label="Click volume" value={80} min={0} max={100} onChange={onChange} />);
  const input = screen.getByRole('slider', { name: 'Click volume' });
  fireEvent.change(input, { target: { value: '50' } });
  expect(onChange).toHaveBeenCalledWith(50);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/ui`
Expected: FAIL with "Cannot find module '.'".

- [ ] **Step 3: Implement**

`src/v2/ui/Button.tsx`:
```tsx
import React from 'react';
import s from './Button.module.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} className={[s.btn, s[variant], s[size], className].filter(Boolean).join(' ')} {...rest} />
  ),
);
Button.displayName = 'Button';
```

`src/v2/ui/Button.module.css`:
```css
.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); border: 1px solid transparent; border-radius: var(--radius-pill); font-weight: 600; cursor: pointer; transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease), opacity var(--dur-fast); white-space: nowrap; }
.btn:disabled { opacity: .45; cursor: default; }
.md { height: 36px; padding: 0 var(--space-4); font-size: var(--text-14); }
.sm { height: 28px; padding: 0 var(--space-3); font-size: var(--text-12); }
.primary { background: var(--gradient-signature); color: var(--note-label); }
.primary:hover:not(:disabled) { opacity: .9; }
.secondary { background: var(--fill); color: var(--text); border-color: var(--line); }
.secondary:hover:not(:disabled) { border-color: var(--line-strong); }
.ghost { background: transparent; color: var(--text-muted); }
.ghost:hover:not(:disabled) { background: var(--fill); color: var(--text); }
.danger { background: transparent; color: var(--danger); border-color: var(--danger); }
```

`src/v2/ui/IconButton.tsx`:
```tsx
import React from 'react';
import s from './IconButton.module.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string; icon: React.ReactNode; active?: boolean; size?: 'sm' | 'md';
};

export const IconButton: React.FC<Props> = ({ label, icon, active, size = 'md', className, type = 'button', ...rest }) => (
  <button type={type} aria-label={label} title={label} aria-pressed={active}
    className={[s.icon, s[size], active ? s.active : '', className].filter(Boolean).join(' ')} {...rest}>
    {icon}
  </button>
);
```

`src/v2/ui/IconButton.module.css`:
```css
.icon { display: inline-grid; place-items: center; border: none; background: transparent; color: var(--text-muted); border-radius: var(--radius-sm); cursor: pointer; transition: background var(--dur-fast), color var(--dur-fast); }
.icon:hover { background: var(--fill); color: var(--text); }
.md { width: 32px; height: 32px; }
.sm { width: 26px; height: 26px; }
.active { color: var(--accent); }
```

`src/v2/ui/Chip.tsx`:
```tsx
import React from 'react';
import s from './Chip.module.css';

export const Chip: React.FC<{ children: React.ReactNode; active?: boolean; onClick?: () => void; title?: string }> = ({
  children, active, onClick, title,
}) => onClick ? (
  <button type="button" title={title} onClick={onClick} aria-expanded={active}
    className={[s.chip, s.button, active ? s.active : ''].join(' ')}>{children}</button>
) : (
  <span title={title} className={s.chip}>{children}</span>
);
```

`src/v2/ui/Chip.module.css`:
```css
.chip { display: inline-flex; align-items: center; gap: var(--space-1); background: var(--fill); color: var(--text-muted); border: 1px solid transparent; border-radius: var(--radius-pill); padding: 2px var(--space-2); font-size: var(--text-11); font-weight: 600; white-space: nowrap; }
.button { cursor: pointer; color: var(--text); font-size: var(--text-12); padding: 4px 10px; }
.button:hover { border-color: var(--line-strong); }
.active { border-color: var(--accent); }
```

`src/v2/ui/SegmentedControl.tsx`:
```tsx
import React from 'react';
import s from './SegmentedControl.module.css';

interface Props<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  onChange(v: T): void;
  size?: 'sm' | 'md';
}

export const SegmentedControl = <T extends string>({ label, value, options, onChange, size = 'md' }: Props<T>) => {
  const idx = Math.max(0, options.findIndex(o => o.value === value));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    onChange(options[(idx + dir + options.length) % options.length].value);
  };
  return (
    <div role="radiogroup" aria-label={label} className={[s.group, s[size]].join(' ')} onKeyDown={onKeyDown}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            title={o.title} className={[s.seg, on ? s.on : ''].join(' ')} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
```

`src/v2/ui/SegmentedControl.module.css`:
```css
.group { display: flex; background: var(--fill); border-radius: var(--radius-sm); padding: 2px; gap: 2px; }
.seg { flex: 1; border: none; background: transparent; color: var(--text-muted); border-radius: 5px; cursor: pointer; font-weight: 500; white-space: nowrap; }
.md .seg { height: 30px; padding: 0 var(--space-3); font-size: var(--text-12); }
.sm .seg { height: 24px; padding: 0 var(--space-2); font-size: var(--text-11); }
.seg:hover { color: var(--text); }
.on { background: var(--text); color: var(--text-inverse); font-weight: 600; }
.on:hover { color: var(--text-inverse); }
```

`src/v2/ui/Switch.tsx`:
```tsx
import React from 'react';
import s from './Switch.module.css';

export const Switch: React.FC<{ label: string; checked: boolean; onChange(v: boolean): void }> = ({ label, checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label}
    className={[s.track, checked ? s.on : ''].join(' ')} onClick={() => onChange(!checked)}>
    <span className={s.thumb} />
  </button>
);
```

`src/v2/ui/Switch.module.css`:
```css
.track { position: relative; width: 36px; height: 20px; border-radius: var(--radius-pill); border: none; background: var(--fill); cursor: pointer; transition: background var(--dur-fast); }
.on { background: var(--gradient-signature); }
.thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--text); transition: transform var(--dur-fast) var(--ease); }
.on .thumb { transform: translateX(16px); background: var(--note-label); }
```

`src/v2/ui/Stepper.tsx`:
```tsx
import React from 'react';
import s from './Stepper.module.css';

interface Props {
  label: string; value: number; min: number; max: number;
  small?: number; big?: number; onChange(v: number): void; format?(v: number): React.ReactNode;
}

export const Stepper: React.FC<Props> = ({ label, value, min, max, small = 1, big, onChange, format }) => {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const lower = label.toLowerCase();
  const btn = (delta: number) => (
    <button type="button" className={s.btn}
      aria-label={`${delta > 0 ? 'Increase' : 'Decrease'} ${lower} by ${Math.abs(delta)}`}
      onClick={() => onChange(clamp(value + delta))}>
      {delta > 0 ? '+' : '−'}{Math.abs(delta)}
    </button>
  );
  return (
    <div className={s.stepper} role="group" aria-label={label}>
      {big && btn(-big)}{btn(-small)}
      <span className={s.value} aria-live="polite">{format ? format(value) : value}</span>
      {btn(small)}{big && btn(big)}
    </div>
  );
};
```

`src/v2/ui/Stepper.module.css`:
```css
.stepper { display: inline-flex; align-items: center; gap: var(--space-1); }
.btn { min-width: 34px; height: 28px; border: none; border-radius: var(--radius-sm); background: var(--fill); color: var(--text); font-weight: 600; font-size: var(--text-12); cursor: pointer; }
.btn:hover { background: var(--line-strong); }
.value { min-width: 48px; text-align: center; font-family: var(--font-mono); font-weight: 700; font-size: var(--text-16); font-variant-numeric: tabular-nums; }
```

`src/v2/ui/Slider.tsx`:
```tsx
import React from 'react';
import s from './Slider.module.css';

interface Props {
  label: string; value: number; min: number; max: number; step?: number;
  onChange(v: number): void; showValue?: boolean; format?(v: number): string;
}

export const Slider: React.FC<Props> = ({ label, value, min, max, step = 1, onChange, showValue, format }) => {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className={s.row}>
      <input type="range" aria-label={label} className={s.range} min={min} max={max} step={step} value={value}
        style={{ ['--pct' as any]: `${pct}%` }} onChange={e => onChange(Number(e.target.value))} />
      {showValue && <span className={s.value}>{format ? format(value) : value}</span>}
    </div>
  );
};
```

`src/v2/ui/Slider.module.css`:
```css
.row { display: flex; align-items: center; gap: var(--space-2); width: 100%; }
.range { -webkit-appearance: none; appearance: none; flex: 1; height: 4px; border-radius: 2px; background: linear-gradient(90deg, var(--accent) 0 var(--pct), var(--fill) var(--pct) 100%); cursor: pointer; }
.range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--text); border: 2px solid var(--surface); box-shadow: var(--elev-1); }
.range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--text); border: 2px solid var(--surface); }
.value { min-width: 40px; text-align: right; color: var(--text-muted); font-size: var(--text-12); font-variant-numeric: tabular-nums; }
```
(The slider fill uses the solid accent rather than the gradient, because a range track gradient can't be clipped to the fill cleanly across browsers. Tell the user about this at the checkpoint.)

`src/v2/ui/LogoMark.tsx`:
```tsx
import React from 'react';
import s from './LogoMark.module.css';

export const LogoMark: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <span aria-hidden="true" className={s.mark} style={{ width: size, height: size }} />
);
```

`src/v2/ui/LogoMark.module.css`:
```css
.mark { display: inline-block; border-radius: 28%; background: var(--gradient-signature); flex: none; }
```

`src/v2/ui/index.ts`:
```ts
export { Button } from './Button';
export { IconButton } from './IconButton';
export { Chip } from './Chip';
export { SegmentedControl } from './SegmentedControl';
export { Switch } from './Switch';
export { Stepper } from './Stepper';
export { Slider } from './Slider';
export { LogoMark } from './LogoMark';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `CI=true npx react-scripts test --watchAll=false src/v2`
Expected: PASS, including `styleHygiene`: no raw colors in the new modules.

- [ ] **Step 5: Checkpoint.** Ask whether to commit (`feat(v2): component kit controls`).

---

### Task 5: Component kit, part B (overlays, tabs, picker)

**Files:**
- Create: `src/v2/ui/Popover.tsx` + `.module.css`
- Create: `src/v2/ui/SideSheet.tsx` + `.module.css`
- Create: `src/v2/ui/Dialog.tsx` + `.module.css`
- Create: `src/v2/ui/Toast.tsx` + `.module.css`
- Create: `src/v2/ui/Tooltip.tsx` + `.module.css`
- Create: `src/v2/ui/Tabs.tsx` + `.module.css`
- Create: `src/v2/ui/Picker.tsx` + `.module.css`
- Create: `src/v2/ui/useFocusTrap.ts`
- Create: `src/v2/ui/useMediaQuery.ts`
- Modify: `src/v2/ui/index.ts`
- Test: `src/v2/ui/overlays.test.tsx`

**Interfaces:**
- Produces:
```ts
Popover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement>; title: string; children: React.ReactNode; placement?: 'top' | 'bottom' }>
SideSheet: React.FC<{ open: boolean; onClose(): void; title: string; children: React.ReactNode }>
Dialog: React.FC<{ open: boolean; onClose(): void; title: string; children: React.ReactNode }>
Toast: React.FC<{ message: string; actionLabel?: string; onAction?(): void; onDismiss(): void; timeoutMs?: number }>
Tooltip: React.FC<{ text: string; children: React.ReactElement }>
Tabs: React.FC<{ label: string; items: Array<{ id: string; label: React.ReactNode }>; activeId: string; onSelect(id: string): void; renderItem?(item, active, defaultNode): React.ReactNode; trailing?: React.ReactNode }>
Picker: <T extends string>(p: { label: string; value: T; options: Array<{ value: T; label: React.ReactNode }>; onChange(v: T): void; columns?: number }) => JSX.Element
useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean): void
useMediaQuery(query: string): boolean
```

- [ ] **Step 1: Write the failing tests**

`src/v2/ui/overlays.test.tsx`:
```tsx
import React, { useRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Popover, SideSheet, Dialog, Toast, Tabs, Picker } from '.';

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  }));
});

const PopoverHarness: React.FC<{ onClose(): void }> = ({ onClose }) => {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={ref}>anchor</button>
      <button>outside</button>
      <Popover open anchorRef={ref} onClose={onClose} title="Tempo"><button>inside</button></Popover>
    </>
  );
};

it('Popover closes on Escape and outside pointerdown, not inside', () => {
  const onClose = jest.fn();
  render(<PopoverHarness onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: 'Tempo' })).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByText('inside'));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByText('outside'));
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);
});

it('Popover does not close when the anchor itself is pressed (the anchor toggles it)', () => {
  const onClose = jest.fn();
  render(<PopoverHarness onClose={onClose} />);
  fireEvent.pointerDown(screen.getByText('anchor'));
  expect(onClose).not.toHaveBeenCalled();
});

it('SideSheet traps focus and closes on Escape', () => {
  const onClose = jest.fn();
  render(<SideSheet open onClose={onClose} title="Metronome"><button>a</button><button>b</button></SideSheet>);
  const sheet = screen.getByRole('dialog', { name: 'Metronome' });
  const buttons = sheet.querySelectorAll('button'); // [close, a, b]
  (buttons[buttons.length - 1] as HTMLElement).focus();
  fireEvent.keyDown(sheet, { key: 'Tab' });
  expect(document.activeElement).toBe(buttons[0]);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

it('Dialog renders nothing when closed', () => {
  render(<Dialog open={false} onClose={() => {}} title="Add card">x</Dialog>);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('Toast runs its action and auto-dismisses', () => {
  jest.useFakeTimers();
  const onAction = jest.fn(); const onDismiss = jest.fn();
  render(<Toast message="Card removed" actionLabel="Undo" onAction={onAction} onDismiss={onDismiss} timeoutMs={5000} />);
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onAction).toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(5000); });
  expect(onDismiss).toHaveBeenCalled();
  jest.useRealTimers();
});

it('Tabs is a tablist with arrow-key navigation', () => {
  const onSelect = jest.fn();
  render(<Tabs label="Workspaces" activeId="a" onSelect={onSelect}
    items={[{ id: 'a', label: 'Warm-up' }, { id: 'b', label: 'Theory' }]} />);
  fireEvent.keyDown(screen.getByRole('tablist', { name: 'Workspaces' }), { key: 'ArrowRight' });
  expect(onSelect).toHaveBeenCalledWith('b');
  expect(screen.getByRole('tab', { name: 'Warm-up' })).toHaveAttribute('aria-selected', 'true');
});

it('Picker selects an option', () => {
  const onChange = jest.fn();
  render(<Picker label="Key" value="C" onChange={onChange} options={[{ value: 'C', label: 'C' }, { value: 'G', label: 'G' }]} />);
  fireEvent.click(screen.getByRole('radio', { name: 'G' }));
  expect(onChange).toHaveBeenCalledWith('G');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `CI=true npx react-scripts test --watchAll=false src/v2/ui/overlays`
Expected: FAIL (exports missing).

- [ ] **Step 3: Implement**

`src/v2/ui/useMediaQuery.ts`:
```ts
import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const get = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
};
```

`src/v2/ui/useFocusTrap.ts`:
```ts
import { useEffect } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Keep Tab/Shift+Tab inside `ref` while active; focus the first control on
 *  open and restore the previously focused element on close. */
export const useFocusTrap = (ref: React.RefObject<HTMLElement>, active: boolean): void => {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    items()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => { el.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [ref, active]);
};
```

`src/v2/ui/Popover.tsx`:
```tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './Popover.module.css';
import { useMediaQuery } from './useMediaQuery';

interface Props {
  open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement>;
  title: string; children: React.ReactNode; placement?: 'top' | 'bottom';
}

/** Anchored pop-up for single quick controls (dock). Becomes a bottom sheet
 *  under 768px. Closes on Escape and outside pointerdown. */
export const Popover: React.FC<Props> = ({ open, onClose, anchorRef, title, children, placement = 'top' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const phone = useMediaQuery('(max-width: 767px)');
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });

  useLayoutEffect(() => {
    if (!open || phone || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 280));
    setPos(placement === 'top' ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 });
  }, [open, phone, anchorRef, placement]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  const root = document.querySelector('.gp2') ?? document.body;
  return createPortal(
    <div ref={ref} role="dialog" aria-label={title} className={[s.pop, phone ? s.sheet : ''].join(' ')}
      style={phone ? undefined : pos}>
      <div className={s.title}>{title}</div>
      {children}
    </div>,
    root,
  );
};
```

`src/v2/ui/Popover.module.css`:
```css
.pop { position: fixed; z-index: 40; width: 272px; background: var(--surface-raised); border: 1px solid var(--line-strong); border-radius: var(--radius-lg); box-shadow: var(--elev-3); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-3); }
.title { font-size: var(--text-11); letter-spacing: .1em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
.sheet { left: 0; right: 0; bottom: 0; width: auto; border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom)); }
```

`src/v2/ui/SideSheet.tsx`:
```tsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import s from './SideSheet.module.css';
import { useFocusTrap } from './useFocusTrap';
import { IconButton } from './IconButton';

interface Props { open: boolean; onClose(): void; title: string; children: React.ReactNode }

/** Right-edge settings panel (bottom sheet under 768px via CSS). The page
 *  behind stays visible and live; there is no scrim over the grid. */
export const SideSheet: React.FC<Props> = ({ open, onClose, title, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const root = document.querySelector('.gp2') ?? document.body;
  return createPortal(
    <aside ref={ref} role="dialog" aria-label={title} className={s.sheet}>
      <header className={s.head}>
        <h2 className={s.title}>{title}</h2>
        <IconButton label="Close" icon={<X size={16} />} onClick={onClose} />
      </header>
      <div className={s.body}>{children}</div>
    </aside>,
    root,
  );
};
```

`src/v2/ui/SideSheet.module.css`:
```css
.sheet { position: fixed; z-index: 30; top: 56px; right: 0; bottom: 64px; width: 340px; background: var(--surface-raised); border-left: 1px solid var(--line-strong); box-shadow: var(--elev-3); display: flex; flex-direction: column; animation: in var(--dur-base) var(--ease); }
.head { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-4) var(--space-2); }
.title { font-size: var(--text-16); }
.body { padding: var(--space-2) var(--space-4) var(--space-6); overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-5); }
@keyframes in { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (max-width: 767px) {
  .sheet { top: auto; left: 0; width: auto; max-height: 70vh; border-left: none; border-top: 1px solid var(--line-strong); border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
}
```

`src/v2/ui/Dialog.tsx`:
```tsx
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import s from './Dialog.module.css';
import { useFocusTrap } from './useFocusTrap';
import { IconButton } from './IconButton';

export const Dialog: React.FC<{ open: boolean; onClose(): void; title: string; children: React.ReactNode }> = ({
  open, onClose, title, children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const root = document.querySelector('.gp2') ?? document.body;
  return createPortal(
    <div className={s.scrim} onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={s.dialog}>
        <header className={s.head}><h2 className={s.title}>{title}</h2><IconButton label="Close" icon={<X size={16} />} onClick={onClose} /></header>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    root,
  );
};
```

`src/v2/ui/Dialog.module.css`:
```css
.scrim { position: fixed; inset: 0; z-index: 50; background: var(--overlay); display: grid; place-items: center; padding: var(--space-4); }
.dialog { width: min(560px, 100%); max-height: 80vh; overflow: auto; background: var(--surface-raised); border: 1px solid var(--line-strong); border-radius: var(--radius-lg); box-shadow: var(--elev-3); }
.head { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-4) 0; }
.title { font-size: var(--text-16); }
.body { padding: var(--space-4); }
```

`src/v2/ui/Toast.tsx`:
```tsx
import React, { useEffect } from 'react';
import s from './Toast.module.css';

interface Props { message: string; actionLabel?: string; onAction?(): void; onDismiss(): void; timeoutMs?: number }

export const Toast: React.FC<Props> = ({ message, actionLabel, onAction, onDismiss, timeoutMs = 6000 }) => {
  useEffect(() => {
    const id = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(id);
  }, [message, onDismiss, timeoutMs]);
  return (
    <div role="status" className={s.toast}>
      <span>{message}</span>
      {actionLabel && onAction && <button type="button" className={s.action} onClick={onAction}>{actionLabel}</button>}
    </div>
  );
};
```

`src/v2/ui/Toast.module.css`:
```css
.toast { position: fixed; z-index: 60; left: 50%; bottom: 80px; transform: translateX(-50%); display: flex; align-items: center; gap: var(--space-4); background: var(--text); color: var(--text-inverse); border-radius: var(--radius-pill); padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4); box-shadow: var(--elev-2); font-weight: 500; }
.action { border: none; background: transparent; color: var(--text-inverse); font-weight: 700; padding: var(--space-1) var(--space-3); border-radius: var(--radius-pill); cursor: pointer; text-decoration: underline; }
```

`src/v2/ui/Tooltip.tsx`:
```tsx
import React, { useId, useState } from 'react';
import s from './Tooltip.module.css';

export const Tooltip: React.FC<{ text: string; children: React.ReactElement }> = ({ text, children }) => {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <span className={s.wrap} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {React.cloneElement(children, { 'aria-describedby': id })}
      {show && <span role="tooltip" id={id} className={s.tip}>{text}</span>}
    </span>
  );
};
```

`src/v2/ui/Tooltip.module.css`:
```css
.wrap { position: relative; display: inline-flex; }
.tip { position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); white-space: nowrap; background: var(--text); color: var(--text-inverse); font-size: var(--text-11); padding: 3px 8px; border-radius: var(--radius-sm); pointer-events: none; z-index: 70; }
```

`src/v2/ui/Tabs.tsx`:
```tsx
import React from 'react';
import s from './Tabs.module.css';

export interface TabItem { id: string; label: React.ReactNode }

interface Props {
  label: string; items: TabItem[]; activeId: string; onSelect(id: string): void;
  renderItem?(item: TabItem, active: boolean, node: React.ReactNode): React.ReactNode;
  trailing?: React.ReactNode;
}

export const Tabs: React.FC<Props> = ({ label, items, activeId, onSelect, renderItem, trailing }) => {
  const idx = Math.max(0, items.findIndex(i => i.id === activeId));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    onSelect(items[(idx + dir + items.length) % items.length].id);
  };
  return (
    <div className={s.bar}>
      <div role="tablist" aria-label={label} className={s.list} onKeyDown={onKeyDown}>
        {items.map(item => {
          const active = item.id === activeId;
          const node = (
            <button key={item.id} type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1}
              className={[s.tab, active ? s.on : ''].join(' ')} onClick={() => onSelect(item.id)}>
              {item.label}
            </button>
          );
          return renderItem ? <React.Fragment key={item.id}>{renderItem(item, active, node)}</React.Fragment> : node;
        })}
      </div>
      {trailing}
    </div>
  );
};
```

`src/v2/ui/Tabs.module.css`:
```css
.bar { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.list { display: flex; gap: var(--space-1); overflow-x: auto; scrollbar-width: none; min-width: 0; }
.tab { border: 1px solid transparent; background: transparent; color: var(--text-muted); border-radius: var(--radius-pill); padding: 5px 12px; font-size: var(--text-12); font-weight: 500; cursor: pointer; white-space: nowrap; }
.tab:hover { color: var(--text); }
.on { background: var(--fill); color: var(--text); font-weight: 600; }
```

`src/v2/ui/Picker.tsx`:
```tsx
import React from 'react';
import s from './Picker.module.css';

interface Props<T extends string> {
  label: string; value: T; options: Array<{ value: T; label: React.ReactNode }>;
  onChange(v: T): void; columns?: number;
}

export const Picker = <T extends string>({ label, value, options, onChange, columns = 6 }: Props<T>) => (
  <div role="radiogroup" aria-label={label} className={s.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {options.map(o => (
      <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
        className={[s.opt, o.value === value ? s.on : ''].join(' ')} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);
```

`src/v2/ui/Picker.module.css`:
```css
.grid { display: grid; gap: 4px; }
.opt { border: none; background: var(--fill); color: var(--text); border-radius: var(--radius-sm); padding: 6px 0; font-weight: 600; font-size: var(--text-12); cursor: pointer; }
.opt:hover { background: var(--line-strong); }
.on, .on:hover { background: var(--text); color: var(--text-inverse); }
```

Append to `src/v2/ui/index.ts`:
```ts
export { Popover } from './Popover';
export { SideSheet } from './SideSheet';
export { Dialog } from './Dialog';
export { Toast } from './Toast';
export { Tooltip } from './Tooltip';
export { Tabs } from './Tabs';
export type { TabItem } from './Tabs';
export { Picker } from './Picker';
export { useMediaQuery } from './useMediaQuery';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `CI=true npx react-scripts test --watchAll=false src/v2`
Expected: PASS.

- [ ] **Step 5: Checkpoint.** Ask whether to commit (`feat(v2): overlays, tabs, picker`).

---

### Task 6: Kit page at `/v2/kit`

**Files:**
- Create: `src/v2/pages/KitPage.tsx` + `KitPage.module.css`
- Modify: `src/v2/V2App.tsx` (route `kit`)
- Test: `src/v2/pages/KitPage.test.tsx`

**Interfaces:** Consumes the kit (Tasks 4–5) and `useV2Store().setThemeMode` (Task 3).

- [ ] **Step 1: Write the failing test**

`src/v2/pages/KitPage.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { KitPage } from './KitPage';

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});

it('renders a section for every kit component', () => {
  render(<KitPage />);
  ['Buttons', 'Icon buttons', 'Chips', 'Segmented control', 'Switch', 'Stepper', 'Slider', 'Picker', 'Tabs', 'Overlays']
    .forEach(name => expect(screen.getByRole('heading', { name })).toBeInTheDocument());
});
```

- [ ] **Step 2: Run the test to verify it fails.** Run: `CI=true npx react-scripts test --watchAll=false src/v2/pages/KitPage`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`src/v2/pages/KitPage.tsx`:
```tsx
import React, { useRef, useState } from 'react';
import { Settings, Play } from 'lucide-react';
import s from './KitPage.module.css';
import {
  Button, IconButton, Chip, SegmentedControl, Switch, Stepper, Slider, Picker, Tabs,
  Popover, SideSheet, Dialog, Toast, Tooltip,
} from '../ui';
import { useV2Store } from '../state/useV2Store';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className={s.section}><h2 className={s.h}>{title}</h2><div className={s.row}>{children}</div></section>
);

export const KitPage: React.FC = () => {
  const themeMode = useV2Store(st => st.themeMode);
  const setThemeMode = useV2Store(st => st.setThemeMode);
  const [seg, setSeg] = useState<'3' | '4' | '6'>('4');
  const [on, setOn] = useState(true);
  const [bpm, setBpm] = useState(96);
  const [vol, setVol] = useState(80);
  const [key, setKey] = useState('A');
  const [tab, setTab] = useState('warm-up');
  const [pop, setPop] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);

  return (
    <main className={s.page}>
      <div className={s.top}>
        <h1>Component kit</h1>
        <SegmentedControl label="Theme" value={themeMode} onChange={setThemeMode}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} />
      </div>
      <Section title="Buttons">
        <Button variant="primary">Primary</Button><Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button>
        <Button size="sm">Small</Button><Button disabled>Disabled</Button>
      </Section>
      <Section title="Icon buttons">
        <IconButton label="Settings" icon={<Settings size={16} />} />
        <IconButton label="Settings (active)" active icon={<Settings size={16} />} />
        <Tooltip text="Play"><IconButton label="Play" icon={<Play size={16} />} /></Tooltip>
      </Section>
      <Section title="Chips"><Chip>follows key</Chip><Chip onClick={() => {}}>A minor</Chip><Chip onClick={() => {}} active>96 BPM</Chip></Section>
      <Section title="Segmented control">
        <SegmentedControl label="Time" value={seg} onChange={setSeg}
          options={[{ value: '3', label: '3/4' }, { value: '4', label: '4/4' }, { value: '6', label: '6/8' }]} />
      </Section>
      <Section title="Switch"><Switch label="Accent first beat" checked={on} onChange={setOn} /></Section>
      <Section title="Stepper"><Stepper label="Tempo" value={bpm} min={40} max={300} small={1} big={5} onChange={setBpm} /></Section>
      <Section title="Slider"><div style={{ width: 240 }}><Slider label="Volume" value={vol} min={0} max={100} onChange={setVol} showValue format={v => `${v}%`} /></div></Section>
      <Section title="Picker">
        <div style={{ width: 260 }}>
          <Picker label="Key" value={key} onChange={setKey}
            options={['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'].map(k => ({ value: k, label: k }))} />
        </div>
      </Section>
      <Section title="Tabs">
        <Tabs label="Workspaces" activeId={tab} onSelect={setTab}
          items={[{ id: 'warm-up', label: 'Warm-up' }, { id: 'theory', label: 'Theory' }, { id: 'jam', label: 'Jam' }]} />
      </Section>
      <Section title="Overlays">
        <Button ref={anchor} onClick={() => setPop(p => !p)}>Popover</Button>
        <Button onClick={() => setSheet(true)}>Side sheet</Button>
        <Button onClick={() => setDialog(true)}>Dialog</Button>
        <Button onClick={() => setToast(true)}>Toast</Button>
      </Section>
      <Popover open={pop} onClose={() => setPop(false)} anchorRef={anchor} title="Tempo" placement="bottom">
        <Stepper label="Tempo" value={bpm} min={40} max={300} small={1} big={5} onChange={setBpm} />
      </Popover>
      <SideSheet open={sheet} onClose={() => setSheet(false)} title="Metronome">
        <SegmentedControl label="Time" value={seg} onChange={setSeg} options={[{ value: '3', label: '3/4' }, { value: '4', label: '4/4' }, { value: '6', label: '6/8' }]} />
        <Slider label="Click volume" value={vol} min={0} max={100} onChange={setVol} />
      </SideSheet>
      <Dialog open={dialog} onClose={() => setDialog(false)} title="Add card"><p>Dialog content</p></Dialog>
      {toast && <Toast message="Card removed" actionLabel="Undo" onAction={() => setToast(false)} onDismiss={() => setToast(false)} />}
    </main>
  );
};
```
`src/v2/pages/KitPage.module.css`:
```css
.page { max-width: 960px; margin: 0 auto; padding: var(--space-8) var(--space-4) 120px; display: flex; flex-direction: column; gap: var(--space-6); }
.top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.section { display: flex; flex-direction: column; gap: var(--space-3); padding-bottom: var(--space-6); border-bottom: 1px solid var(--line); }
.h { font-size: var(--text-12); letter-spacing: .1em; text-transform: uppercase; color: var(--text-muted); font-family: var(--font-ui); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
```

`src/v2/V2App.tsx`: replace the skeleton with the store-driven theme and add the kit route:
```tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeRoot } from './theme/ThemeRoot';
import { useV2Store } from './state/useV2Store';
import { KitPage } from './pages/KitPage';

const V2App: React.FC = () => {
  const themeMode = useV2Store(s => s.themeMode);
  return (
    <ThemeRoot mode={themeMode}>
      <Routes>
        <Route path="kit" element={<KitPage />} />
        <Route index element={<main style={{ padding: 24 }}>v2 practice</main>} />
      </Routes>
    </ThemeRoot>
  );
};

export default V2App;
```

- [ ] **Step 4: Run the tests.** `CI=true npx react-scripts test --watchAll=false src/v2 && npx tsc --noEmit -p .`. Expected: PASS.

- [ ] **Step 5: Manual check.** At `/v2/kit`:
  - Toggle Dark, Light and System and confirm every component reads well in both themes.
  - Tab through the page: every control shows the focus ring.
  - The popover closes on Escape and on an outside click.
  - The sheet traps focus.

- [ ] **Step 6: Checkpoint.** Ask whether to commit (`feat(v2): component kit page`).

---

### Task 7: App shell (top bar, layout, settings sheet, toast host)

**Files:**
- Create: `src/v2/shell/V2Layout.tsx` + `V2Layout.module.css`
- Create: `src/v2/shell/TopBar.tsx` + `TopBar.module.css`
- Create: `src/v2/shell/SettingsSheet.tsx`
- Create: `src/v2/shell/ToastHost.tsx`
- Create: `src/v2/shell/tunings.ts`
- Modify: `src/v2/V2App.tsx`
- Test: `src/v2/shell/TopBar.test.tsx`

**Interfaces:**
- Consumes:
  - `useV2Store`: `themeMode`, `setThemeMode`, `overlay`, `setOverlay`, `toast`, `undo`, `dismissToast`
  - `useStore` (shared): `note.tuning`, `setTuning`, `jam.mixer.master.volume`, `setJamMixerVolume`
  - `setMasterVolume` from `src/audio`
  - `BRAND`
- Produces:
  - `<V2Layout/>` renders the top bar, `<Outlet/>`, `<Dock/>` (placeholder until Task 8), `<CardSheetHost/>` (placeholder until Task 10), `<SettingsSheet/>` and `<ToastHost/>`
  - `TUNING_PRESETS: Array<{ name: string; tuning: string[] }>`

- [ ] **Step 1: Write the failing test**

`src/v2/shell/TopBar.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from './TopBar';
import { useV2Store } from '../state/useV2Store';
import { BRAND } from '../brand';

beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><TopBar /></MemoryRouter>);

it('shows the brand name and marks the active section', () => {
  renderAt('/v2/learn');
  expect(screen.getByText(BRAND.name)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Practice' })).not.toHaveAttribute('aria-current');
});

it('cycles theme mode dark → light → system → dark', () => {
  renderAt('/v2');
  const btn = screen.getByRole('button', { name: /theme/i });
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('light');
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('system');
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('dark');
});

it('opens app settings', () => {
  renderAt('/v2');
  fireEvent.click(screen.getByRole('button', { name: 'App settings' }));
  expect(useV2Store.getState().overlay).toEqual({ kind: 'settings' });
});
```

- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`src/v2/shell/tunings.ts` (copied from v1 `TuningPicker` presets, high-to-low string order to match `note.tuning`):
```ts
export const TUNING_PRESETS: Array<{ name: string; tuning: string[] }> = [
  { name: 'Standard', tuning: ['E', 'B', 'G', 'D', 'A', 'E'] },
  { name: 'Drop D', tuning: ['E', 'B', 'G', 'D', 'A', 'D'] },
  { name: 'Open G', tuning: ['D', 'B', 'G', 'D', 'G', 'D'] },
  { name: 'Open D', tuning: ['D', 'A', 'F#', 'D', 'A', 'D'] },
  { name: 'Half step down', tuning: ['Eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb'] },
];
```

`src/v2/shell/TopBar.tsx`:
```tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Moon, Sun, Monitor, Settings } from 'lucide-react';
import s from './TopBar.module.css';
import { BRAND } from '../brand';
import { LogoMark, IconButton } from '../ui';
import { useV2Store, ThemeMode } from '../state/useV2Store';

const NEXT: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'system', system: 'dark' };
const ICON: Record<ThemeMode, React.ReactNode> = { dark: <Moon size={16} />, light: <Sun size={16} />, system: <Monitor size={16} /> };

export const TopBar: React.FC = () => {
  const themeMode = useV2Store(st => st.themeMode);
  const setThemeMode = useV2Store(st => st.setThemeMode);
  const setOverlay = useV2Store(st => st.setOverlay);
  const link = ({ isActive }: { isActive: boolean }) => [s.link, isActive ? s.on : ''].join(' ');
  return (
    <header className={s.bar}>
      <NavLink to="/v2" end className={s.brand}><LogoMark /><span className={s.name}>{BRAND.name}</span></NavLink>
      <nav className={s.nav} aria-label="Sections">
        <NavLink to="/v2" end className={link}>Practice</NavLink>
        <NavLink to="/v2/learn" className={link}>Learn</NavLink>
        <NavLink to="/v2/read" className={link}>Read</NavLink>
      </nav>
      <div className={s.right}>
        <IconButton label={`Theme: ${themeMode}`} icon={ICON[themeMode]} onClick={() => setThemeMode(NEXT[themeMode])} />
        <IconButton label="App settings" icon={<Settings size={16} />} onClick={() => setOverlay({ kind: 'settings' })} />
      </div>
    </header>
  );
};
```

`src/v2/shell/TopBar.module.css`:
```css
.bar { position: sticky; top: 0; z-index: 20; height: 56px; display: flex; align-items: center; gap: var(--space-6); padding: 0 var(--space-4); background: var(--bg); border-bottom: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: var(--space-2); text-decoration: none; }
.name { font-family: var(--font-display); font-weight: 700; font-size: var(--text-16); }
.nav { display: flex; gap: var(--space-5); }
.link { color: var(--text-muted); text-decoration: none; font-weight: 500; padding: var(--space-1) 0; }
.link:hover { color: var(--text); }
.on { color: var(--text); font-weight: 600; box-shadow: inset 0 -2px 0 var(--accent); }
.right { margin-left: auto; display: flex; gap: var(--space-1); }
@media (max-width: 767px) { .name { display: none; } .bar { gap: var(--space-4); } }
```

`src/v2/shell/SettingsSheet.tsx`:
```tsx
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SideSheet, SegmentedControl, Slider, Picker } from '../ui';
import { useV2Store, ThemeMode } from '../state/useV2Store';
import { useStore } from '../../store/useStore';
import { TUNING_PRESETS } from './tunings';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <span style={{ fontSize: 'var(--text-12)', color: 'var(--text-muted)' }}>{label}</span>{children}
  </div>
);

export const SettingsSheet: React.FC = () => {
  const open = useV2Store(st => st.overlay?.kind === 'settings');
  const setOverlay = useV2Store(st => st.setOverlay);
  const themeMode = useV2Store(st => st.themeMode);
  const setThemeMode = useV2Store(st => st.setThemeMode);
  const { tuning, setTuning, master, setJamMixerVolume } = useStore(useShallow(st => ({
    tuning: st.note.tuning, setTuning: st.setTuning,
    master: st.jam.mixer.master.volume, setJamMixerVolume: st.setJamMixerVolume,
  })));
  const current = TUNING_PRESETS.find(p => p.tuning.join() === tuning.join())?.name ?? 'Custom';
  return (
    <SideSheet open={open} onClose={() => setOverlay(null)} title="App settings">
      <Field label="Theme">
        <SegmentedControl<ThemeMode> label="Theme" value={themeMode} onChange={setThemeMode}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} />
      </Field>
      <Field label={`Tuning · ${current}`}>
        <Picker label="Tuning" value={current} columns={2}
          onChange={name => { const p = TUNING_PRESETS.find(t => t.name === name); if (p) setTuning(p.tuning); }}
          options={TUNING_PRESETS.map(p => ({ value: p.name, label: p.name }))} />
      </Field>
      <Field label="Master volume">
        <Slider label="Master volume" value={Math.min(master, 100)} min={0} max={100}
          onChange={v => setJamMixerVolume('master', v)} showValue format={v => `${v}%`} />
      </Field>
    </SideSheet>
  );
};
```

`src/v2/shell/ToastHost.tsx`:
```tsx
import React from 'react';
import { Toast } from '../ui';
import { useV2Store } from '../state/useV2Store';

export const ToastHost: React.FC = () => {
  const toast = useV2Store(st => st.toast);
  const undo = useV2Store(st => st.undo);
  const dismissToast = useV2Store(st => st.dismissToast);
  if (!toast) return null;
  return (
    <Toast message={toast.message} actionLabel={toast.undoable ? 'Undo' : undefined}
      onAction={toast.undoable ? undo : undefined} onDismiss={dismissToast} />
  );
};
```

`src/v2/shell/V2Layout.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import s from './V2Layout.module.css';
import { TopBar } from './TopBar';
import { SettingsSheet } from './SettingsSheet';
import { ToastHost } from './ToastHost';
import { useStore } from '../../store/useStore';
import { setMasterVolume } from '../../audio';

/** The v2 frame. Also applies master volume to the audio engine — in v1 only
 *  the Jam card did this, so v2 owns it at the shell level. */
export const V2Layout: React.FC<{ dock?: React.ReactNode; sheetHost?: React.ReactNode }> = ({ dock, sheetHost }) => {
  const master = useStore(st => st.jam.mixer.master.volume);
  useEffect(() => { setMasterVolume(master / 100); }, [master]);
  return (
    <div className={s.frame}>
      <TopBar />
      <div className={s.content}><Outlet /></div>
      {dock}
      {sheetHost}
      <SettingsSheet />
      <ToastHost />
    </div>
  );
};
```

`src/v2/shell/V2Layout.module.css`:
```css
.frame { min-height: 100vh; display: flex; flex-direction: column; }
.content { flex: 1; padding-bottom: 72px; }
```

`src/v2/V2App.tsx`: nest the routes under the layout:
```tsx
<Routes>
  <Route path="kit" element={<KitPage />} />
  <Route element={<V2Layout />}>
    <Route index element={<main style={{ padding: 24 }}>Practice</main>} />
    <Route path="learn" element={<main style={{ padding: 24 }}>Learn</main>} />
    <Route path="read" element={<main style={{ padding: 24 }}>Read</main>} />
  </Route>
</Routes>
```

- [ ] **Step 4: Run the tests.** `CI=true npx react-scripts test --watchAll=false src/v2 && npx tsc --noEmit -p .`. Expected: PASS.

- [ ] **Step 5: Manual check.**
  - The nav links switch sections with the underline.
  - The theme button cycles modes.
  - ⚙ opens the settings sheet, and changing tuning updates v1's fretboard at `/` (shared state).

- [ ] **Step 6: Checkpoint.** Ask whether to commit (`feat(v2): app shell, top bar, settings`).

---

### Task 8: Docked player bar, pop-ups, tap tempo and shortcuts

**Files:**
- Create: `src/v2/shell/dock/tapTempo.ts`
- Create: `src/v2/shell/useShortcuts.ts`
- Create: `src/v2/shell/dock/Dock.tsx` + `Dock.module.css`
- Create: `src/v2/shell/dock/KeyPopover.tsx`
- Create: `src/v2/shell/dock/TempoPopover.tsx`
- Create: `src/v2/shell/dock/MeterPopover.tsx`
- Create: `src/v2/shell/dock/BeatDots.tsx` + `BeatDots.module.css`
- Modify: `src/v2/V2App.tsx` (pass `dock={<Dock/>}`)
- Test: `src/v2/shell/dock/tapTempo.test.ts`
- Test: `src/v2/shell/useShortcuts.test.tsx`
- Test: `src/v2/shell/dock/Dock.test.tsx`

**Interfaces:**
- Consumes:
  - `useStore`: `metronome.{isPlaying,bpm,beatsPerMeasure,subdivision,volume}`, `note.{selectedNote,selectedScale}`, `jam.mixer.{master,chords}`
  - Setters `setMetronomePlaying`, `setBpm`, `setSelectedNote`, `setSelectedScale`, `setBeatsPerMeasure`, `setSubdivision`, `setMetronomeVolume`, `setJamMixerVolume`
  - `useTransport` and `setClickVolume` from `src/audio`
  - `scales` from `src/data/musicData`
  - Kit components
- Produces:
  - `tapTempo(state: TapState, now: number): TapState`, where `TapState = { taps: number[]; bpm: number | null }`, plus `INITIAL_TAP: TapState`
  - `useShortcuts(): void` (mounted once in `Dock`)
  - `clampBpm(v: number): number`
  - `<BeatDots count={n} size="sm"|"md" />` (reused by the Metronome card)

- [ ] **Step 1: Write the failing tests**

`src/v2/shell/dock/tapTempo.test.ts`:
```ts
import { tapTempo, INITIAL_TAP, clampBpm } from './tapTempo';

const tapAt = (times: number[]) => times.reduce(tapTempo, INITIAL_TAP);

it('needs two taps before producing a BPM', () => {
  expect(tapAt([1000]).bpm).toBeNull();
  expect(tapAt([1000, 1500]).bpm).toBe(120);
});

it('averages the last four intervals', () => {
  // intervals 500, 500, 500, 1000 -> avg over last 4 = 625ms -> 96 BPM
  expect(tapAt([0, 500, 1000, 1500, 2500]).bpm).toBe(96);
  // older intervals drop out: last 4 intervals are all 500 -> 120
  expect(tapAt([0, 1000, 1500, 2000, 2500, 3000]).bpm).toBe(120);
});

it('resets after a gap of 2 seconds or more', () => {
  const s = tapAt([0, 500, 3000]);
  expect(s.taps).toEqual([3000]);
  expect(s.bpm).toBeNull();
});

it('clamps to 40..300 and never returns NaN/Infinity', () => {
  expect(tapAt([0, 50]).bpm).toBe(300);          // 1200 BPM -> 300
  expect(tapAt([0, 1999]).bpm).toBe(40);         // ~30 BPM -> 40
  expect(tapAt([1000, 1000]).bpm).toBe(300);     // zero interval -> clamped, finite
  expect(clampBpm(Number.NaN)).toBe(40);
});
```

`src/v2/shell/useShortcuts.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useShortcuts } from './useShortcuts';
import { useStore } from '../../store/useStore';
import { useV2Store } from '../state/useV2Store';

const Harness = () => { useShortcuts(); return <div><input aria-label="name" /><input type="range" aria-label="vol" /></div>; };
const m = () => useStore.getState().metronome;

beforeEach(() => {
  act(() => {
    useStore.setState(st => ({ metronome: { ...st.metronome, isPlaying: false, bpm: 100 } }));
    useV2Store.setState(useV2Store.getInitialState(), true);
  });
});
afterEach(() => act(() => useStore.getState().setMetronomePlaying(false)));

it('Space toggles play/stop; arrows change BPM; K opens the key pop-up', () => {
  render(<Harness />);
  fireEvent.keyDown(window, { key: ' ' });
  expect(m().isPlaying).toBe(true);
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  expect(m().bpm).toBe(101);
  fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
  expect(m().bpm).toBe(96);
  fireEvent.keyDown(window, { key: 'k' });
  expect(useV2Store.getState().overlay).toEqual({ kind: 'popover', id: 'key' });
});

it('ignores keys while typing or on a slider, and with modifiers', () => {
  const { getByLabelText } = render(<Harness />);
  fireEvent.keyDown(getByLabelText('name'), { key: ' ' });
  fireEvent.keyDown(getByLabelText('vol'), { key: 'ArrowUp' });
  fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true });
  expect(m().isPlaying).toBe(false);
  expect(m().bpm).toBe(100);
});

it('clamps BPM at the limits', () => {
  act(() => useStore.getState().setBpm(300));
  render(<Harness />);
  fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true });
  expect(m().bpm).toBe(300);
});
```

`src/v2/shell/dock/Dock.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dock } from './Dock';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});
beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  useStore.getState().setSelectedNote('A');
  useStore.getState().setSelectedScale('Aeolian (Natural Minor)');
}));
afterEach(() => act(() => useStore.getState().setMetronomePlaying(false)));

it('shows key, BPM and play; play toggles the shared transport state', () => {
  render(<Dock />);
  expect(screen.getByRole('button', { name: /A minor/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(useStore.getState().metronome.isPlaying).toBe(true);
  expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
});

it('key pop-up sets key and major/minor in the shared store', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /A minor/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'E' }));
  expect(useStore.getState().note.selectedNote).toBe('E');
  fireEvent.click(screen.getByRole('radio', { name: 'Major' }));
  expect(useStore.getState().note.selectedScale).toBe('Major (Ionian)');
});

it('only one pop-up is open at a time', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /A minor/ }));
  fireEvent.click(screen.getByRole('button', { name: /BPM/ }));
  expect(screen.queryByRole('dialog', { name: 'Key' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Tempo' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Run: `CI=true npx react-scripts test --watchAll=false src/v2/shell`. Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/v2/shell/dock/tapTempo.ts`:
```ts
export const BPM_MIN = 40;
export const BPM_MAX = 300;
const RESET_GAP_MS = 2000;
const WINDOW = 4;

export const clampBpm = (v: number): number =>
  Number.isFinite(v) ? Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(v))) : BPM_MIN;

export interface TapState { taps: number[]; bpm: number | null }
export const INITIAL_TAP: TapState = { taps: [], bpm: null };

/** Pure tap-tempo reducer: BPM from the average of the last ≤4 intervals. */
export const tapTempo = (state: TapState, now: number): TapState => {
  const last = state.taps[state.taps.length - 1];
  if (last === undefined || now - last >= RESET_GAP_MS) return { taps: [now], bpm: null };
  const taps = [...state.taps, now].slice(-(WINDOW + 1));
  const intervals = taps.slice(1).map((t, i) => t - taps[i]);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = avg <= 0 ? BPM_MAX : clampBpm(60000 / avg);
  return { taps, bpm };
};
```

`src/v2/shell/useShortcuts.ts`:
```ts
import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useV2Store } from '../state/useV2Store';
import { clampBpm } from './dock/tapTempo';

const isTyping = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/** Global v2 shortcuts. Space: play/stop · ↑/↓: BPM ±1 (Shift ±5) · K: key pop-up. */
export const useShortcuts = (): void => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const st = useStore.getState();
      if (e.key === ' ') {
        // Let focused buttons handle Space themselves.
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        st.setMetronomePlaying(!st.metronome.isPlaying);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = (e.shiftKey ? 5 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
        st.setBpm(clampBpm(st.metronome.bpm + step));
      } else if (e.key === 'k' || e.key === 'K') {
        useV2Store.getState().setOverlay({ kind: 'popover', id: 'key' });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
```

`src/v2/shell/dock/BeatDots.tsx`:
```tsx
import React from 'react';
import s from './BeatDots.module.css';
import { useTransport } from '../../../audio';

/** Heard beat position from the app-wide transport. Lights instantly on the
 *  frame the beat is heard (no transition in). */
export const BeatDots: React.FC<{ count: number; size?: 'sm' | 'md' }> = ({ count, size = 'sm' }) => {
  const running = useTransport(t => t.running);
  const beat = useTransport(t => t.beatInBar);
  const heard = useTransport(t => t.beatCount >= 0);
  const active = running && heard ? beat : -1;
  return (
    <div className={[s.dots, s[size]].join(' ')} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={[s.dot, i === active ? s.on : '', i === 0 ? s.first : ''].join(' ')} />
      ))}
    </div>
  );
};
```

`src/v2/shell/dock/BeatDots.module.css`:
```css
.dots { display: flex; align-items: center; }
.sm { gap: 5px; } .sm .dot { width: 8px; height: 8px; }
.md { gap: 10px; } .md .dot { width: 14px; height: 14px; }
.dot { border-radius: 50%; background: var(--fill); transition: background 150ms var(--ease), transform 150ms var(--ease); }
.on { background: var(--accent); transform: scale(1.2); transition: none; }
.first.on { background: var(--text); }
```

`src/v2/shell/dock/KeyPopover.tsx`:
```tsx
import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Popover, Picker, SegmentedControl } from '../../ui';
import { useStore } from '../../../store/useStore';
import { scales } from '../../../data/musicData';

export const CIRCLE_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MAJOR = 'Major (Ionian)';
const MINOR = 'Aeolian (Natural Minor)';

export const scaleShortName = (scale: string | null): string =>
  scale === MAJOR ? 'major' : scale === MINOR ? 'minor' : (scale ?? '');

export const KeyPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement> }> = (p) => {
  const { note, scale, setSelectedNote, setSelectedScale } = useStore(useShallow(st => ({
    note: st.note.selectedNote, scale: st.note.selectedScale,
    setSelectedNote: st.setSelectedNote, setSelectedScale: st.setSelectedScale,
  })));
  const [modes, setModes] = useState(false);
  const kind = scale === MAJOR ? 'major' : scale === MINOR ? 'minor' : 'modes';
  return (
    <Popover {...p} title="Key">
      <Picker label="Key" value={note ?? 'C'} onChange={setSelectedNote}
        options={CIRCLE_KEYS.map(k => ({ value: k, label: k }))} />
      <SegmentedControl label="Scale type" value={modes ? 'modes' : kind}
        onChange={v => { if (v === 'modes') setModes(true); else { setModes(false); setSelectedScale(v === 'major' ? MAJOR : MINOR); } }}
        options={[{ value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' }, { value: 'modes', label: 'Modes…' }]} />
      {(modes || kind === 'modes') && (
        <Picker label="Scale" value={scale ?? MAJOR} onChange={setSelectedScale} columns={2}
          options={Object.keys(scales).map(name => ({ value: name, label: name }))} />
      )}
    </Popover>
  );
};
```

`src/v2/shell/dock/TempoPopover.tsx`:
```tsx
import React, { useRef, useState } from 'react';
import { Popover, Stepper, Slider, Button } from '../../ui';
import { useStore } from '../../../store/useStore';
import { tapTempo, INITIAL_TAP, clampBpm, BPM_MIN, BPM_MAX } from './tapTempo';

export const TempoPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement> }> = (p) => {
  const bpm = useStore(st => st.metronome.bpm);
  const setBpm = useStore(st => st.setBpm);
  const tapRef = useRef(INITIAL_TAP);
  const [taps, setTaps] = useState(0);
  const onTap = () => {
    tapRef.current = tapTempo(tapRef.current, performance.now());
    setTaps(tapRef.current.taps.length);
    if (tapRef.current.bpm !== null) setBpm(tapRef.current.bpm);
  };
  return (
    <Popover {...p} title="Tempo">
      <Stepper label="Tempo" value={bpm} min={BPM_MIN} max={BPM_MAX} small={1} big={5} onChange={v => setBpm(clampBpm(v))} />
      <Slider label="Tempo slider" value={bpm} min={BPM_MIN} max={BPM_MAX} onChange={v => setBpm(clampBpm(v))} />
      <Button onClick={onTap}>Tap tempo{taps > 1 ? ` · ${taps}` : ''}</Button>
    </Popover>
  );
};
```

`src/v2/shell/dock/MeterPopover.tsx`:
```tsx
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Popover, SegmentedControl, Slider } from '../../ui';
import { useStore } from '../../../store/useStore';
import { setClickVolume } from '../../../audio';

type Sub = 'quarter' | 'eighth' | 'sixteenth' | 'eighthTriplet' | 'sixteenthTriplet';
export const SUBDIVISIONS: Array<{ value: Sub; label: string; title: string }> = [
  { value: 'quarter', label: '♩', title: 'Quarter notes' },
  { value: 'eighth', label: '♫', title: 'Eighth notes' },
  { value: 'sixteenth', label: '♬', title: 'Sixteenth notes' },
  { value: 'eighthTriplet', label: '♫₃', title: 'Eighth-note triplets' },
  { value: 'sixteenthTriplet', label: '♬₃', title: 'Sixteenth-note triplets' },
];
export const METERS = ['2', '3', '4', '5', '6', '7'] as const;

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 'var(--text-11)', color: 'var(--text-muted)' }}>{label}</span>{children}
  </div>
);

export const MeterPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement> }> = (p) => {
  const st = useStore(useShallow(s => ({
    beats: s.metronome.beatsPerMeasure, sub: s.metronome.subdivision as Sub, click: s.metronome.volume,
    master: s.jam.mixer.master.volume, pad: s.jam.mixer.chords.volume,
    setBeatsPerMeasure: s.setBeatsPerMeasure, setSubdivision: s.setSubdivision,
    setMetronomeVolume: s.setMetronomeVolume, setJamMixerVolume: s.setJamMixerVolume,
  })));
  return (
    <Popover {...p} title="Meter & volume">
      <Row label="Beats per bar">
        <SegmentedControl label="Beats per bar" size="sm" value={String(st.beats)} onChange={v => st.setBeatsPerMeasure(Number(v))}
          options={METERS.map(m => ({ value: m, label: m }))} />
      </Row>
      <Row label="Subdivision">
        <SegmentedControl label="Subdivision" size="sm" value={st.sub} onChange={st.setSubdivision} options={SUBDIVISIONS} />
      </Row>
      <Row label="Master"><Slider label="Master volume" value={Math.min(st.master, 100)} min={0} max={100} onChange={v => st.setJamMixerVolume('master', v)} /></Row>
      <Row label="Click"><Slider label="Click volume" value={st.click} min={0} max={100} onChange={v => { st.setMetronomeVolume(v); setClickVolume(v / 100); }} /></Row>
      <Row label="Pad"><Slider label="Pad volume" value={st.pad} min={0} max={100} onChange={v => st.setJamMixerVolume('chords', v)} /></Row>
    </Popover>
  );
};
```
(The pad slider writes shared state now. The v2 Jam card, built later, applies it to the pad engine.)

`src/v2/shell/dock/Dock.tsx`:
```tsx
import React, { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square } from 'lucide-react';
import s from './Dock.module.css';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { useShortcuts } from '../useShortcuts';
import { BeatDots } from './BeatDots';
import { KeyPopover, scaleShortName } from './KeyPopover';
import { TempoPopover } from './TempoPopover';
import { MeterPopover, SUBDIVISIONS } from './MeterPopover';

export const Dock: React.FC = () => {
  useShortcuts();
  const st = useStore(useShallow(x => ({
    playing: x.metronome.isPlaying, bpm: x.metronome.bpm, beats: x.metronome.beatsPerMeasure,
    sub: x.metronome.subdivision, master: x.jam.mixer.master.volume,
    note: x.note.selectedNote, scale: x.note.selectedScale, setMetronomePlaying: x.setMetronomePlaying,
  })));
  const overlay = useV2Store(x => x.overlay);
  const setOverlay = useV2Store(x => x.setOverlay);
  const keyRef = useRef<HTMLButtonElement>(null);
  const tempoRef = useRef<HTMLButtonElement>(null);
  const meterRef = useRef<HTMLButtonElement>(null);
  const openId = overlay?.kind === 'popover' ? overlay.id : null;
  const toggle = (id: 'key' | 'tempo' | 'meter') => setOverlay(openId === id ? null : { kind: 'popover', id });
  const close = () => setOverlay(null);
  const subLabel = SUBDIVISIONS.find(x => x.value === st.sub)?.label ?? '♩';

  return (
    <div className={s.dock} role="region" aria-label="Player">
      <button type="button" className={s.play} aria-label={st.playing ? 'Stop' : 'Play'}
        onClick={() => st.setMetronomePlaying(!st.playing)}>
        {st.playing ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <button ref={keyRef} type="button" className={s.chip} aria-expanded={openId === 'key'} onClick={() => toggle('key')}>
        {st.note ?? '—'} {scaleShortName(st.scale)}
      </button>
      <button ref={tempoRef} type="button" className={s.tempo} aria-expanded={openId === 'tempo'} onClick={() => toggle('tempo')}>
        <span className={s.bpm}>{st.bpm}</span><span className={s.muted}>BPM</span>
      </button>
      <BeatDots count={st.beats} />
      <button ref={meterRef} type="button" className={s.summary} aria-expanded={openId === 'meter'} onClick={() => toggle('meter')}>
        {st.beats}/4 · {subLabel} · {Math.min(st.master, 100)}%
      </button>
      <KeyPopover open={openId === 'key'} onClose={close} anchorRef={keyRef} />
      <TempoPopover open={openId === 'tempo'} onClose={close} anchorRef={tempoRef} />
      <MeterPopover open={openId === 'meter'} onClose={close} anchorRef={meterRef} />
    </div>
  );
};
```

`src/v2/shell/dock/Dock.module.css`:
```css
.dock { position: fixed; z-index: 25; left: 0; right: 0; bottom: 0; height: 64px; display: flex; align-items: center; gap: var(--space-3); padding: 0 var(--space-4) env(safe-area-inset-bottom); background: var(--surface); border-top: 1px solid var(--line); }
.play { width: 40px; height: 40px; border-radius: 50%; border: none; background: var(--gradient-signature); color: var(--note-label); display: grid; place-items: center; cursor: pointer; flex: none; }
.chip, .tempo, .summary { border: 1px solid transparent; background: var(--fill); color: var(--text); border-radius: var(--radius-pill); padding: 6px 12px; font-weight: 600; font-size: var(--text-12); cursor: pointer; white-space: nowrap; }
.chip:hover, .tempo:hover, .summary:hover, [aria-expanded='true'] { border-color: var(--accent); }
.tempo { display: flex; align-items: baseline; gap: var(--space-1); background: transparent; }
.bpm { font-family: var(--font-mono); font-weight: 700; font-size: var(--text-16); font-variant-numeric: tabular-nums; }
.muted { color: var(--text-muted); font-size: var(--text-11); }
.summary { margin-left: auto; background: transparent; color: var(--text-muted); font-weight: 500; }
@media (max-width: 767px) { .summary { display: none; } }
```

`src/v2/V2App.tsx`: `<Route element={<V2Layout dock={<Dock />} />}>`.

- [ ] **Step 4: Run the tests to verify they pass.** Run: `CI=true npx react-scripts test --watchAll=false src/v2 && npx tsc --noEmit -p .`. Expected: PASS.

- [ ] **Step 5: Manual check.**
  - Play in the dock: the click sounds and the beat dots light on each heard beat.
  - Key, BPM and meter pop-ups: one open at a time, Escape and an outside click close them.
  - Tap tempo sets the BPM.
  - Space, ↑/↓ and K work, but not while typing in a field.
  - Changing the key updates v1 at `/` too.

- [ ] **Step 6: Checkpoint.** Ask whether to commit (`feat(v2): docked player bar, pop-ups, tap tempo, shortcuts`).

---

### Task 9: Card registry, grid rules, card frame and the Metronome card

**Files:**
- Create: `src/v2/cards/grid.ts`
- Create: `src/v2/cards/registry.ts`
- Create: `src/v2/cards/CardFrame.tsx` + `CardFrame.module.css`
- Create: `src/v2/cards/metronome/MetronomeFace.tsx` + `Metronome.module.css`
- Create: `src/v2/cards/metronome/MetronomeSheet.tsx`
- Test: `src/v2/cards/grid.test.ts`
- Test: `src/v2/cards/metronome/Metronome.test.tsx`

**Interfaces:**
- Consumes: kit, `BeatDots`, `SUBDIVISIONS`, `METERS`, `clampBpm`, `useStore`, `setClickVolume`.
- Produces:
```ts
// grid.ts
export type ColSpan = 3 | 4 | 6 | 12;
export const columnsForWidth = (px: number): 12 | 8 | 1 => …;
export const clampSpan = (span: ColSpan, columns: number): number => …;
// registry.ts
export interface CardDef {
  id: string; title: string; description: string;
  size: { colSpan: ColSpan; rowSpan: number };
  follows: Array<'key' | 'tempo'>;
  Face: React.FC; Sheet?: React.FC;
}
export const CARDS: CardDef[];
export const getCard = (id: string): CardDef | undefined => …;
// CardFrame.tsx
export const CardFrame: React.FC<{ def: CardDef; editing: boolean; onOpenSheet(): void; menu?: React.ReactNode; dragHandleProps?: React.HTMLAttributes<HTMLElement> }>;
```

- [ ] **Step 1: Write the failing tests**

`src/v2/cards/grid.test.ts`:
```ts
import { columnsForWidth, clampSpan } from './grid';

it('picks columns per breakpoint', () => {
  expect(columnsForWidth(1440)).toBe(12);
  expect(columnsForWidth(1200)).toBe(12);
  expect(columnsForWidth(1199)).toBe(8);
  expect(columnsForWidth(768)).toBe(8);
  expect(columnsForWidth(767)).toBe(1);
});

it('clamps spans to the column count', () => {
  expect(clampSpan(12, 8)).toBe(8);
  expect(clampSpan(6, 8)).toBe(6);
  expect(clampSpan(3, 1)).toBe(1);
  expect(clampSpan(4, 12)).toBe(4);
});
```

`src/v2/cards/metronome/Metronome.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MetronomeFace } from './MetronomeFace';
import { MetronomeSheet } from './MetronomeSheet';
import { useStore } from '../../../store/useStore';
import { getCard } from '../registry';

beforeEach(() => act(() => {
  useStore.setState(st => ({ metronome: { ...st.metronome, bpm: 100, isPlaying: false, beatsPerMeasure: 4 } }));
}));
afterEach(() => act(() => useStore.getState().setMetronomePlaying(false)));

it('is registered as a small card that follows tempo', () => {
  expect(getCard('metronome')).toMatchObject({ title: 'Metronome', size: { colSpan: 3 }, follows: ['tempo'] });
});

it('face shows BPM, steps it within range, and plays the shared transport', () => {
  render(<MetronomeFace />);
  expect(screen.getByText('100')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 5' }));
  expect(useStore.getState().metronome.bpm).toBe(105);
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(useStore.getState().metronome.isPlaying).toBe(true);
});

it('sheet edits time signature, subdivision, accent and sound in the shared store', () => {
  render(<MetronomeSheet />);
  fireEvent.click(screen.getByRole('radio', { name: '3' }));
  expect(useStore.getState().metronome.beatsPerMeasure).toBe(3);
  fireEvent.click(screen.getByRole('radio', { name: '♫' }));
  expect(useStore.getState().metronome.subdivision).toBe('eighth');
  const accent = screen.getByRole('switch', { name: 'Accent first beat' });
  const before = useStore.getState().metronome.emphasizeFirstBeat;
  fireEvent.click(accent);
  expect(useStore.getState().metronome.emphasizeFirstBeat).toBe(!before);
  fireEvent.click(screen.getByRole('radio', { name: 'Synth' }));
  expect(useStore.getState().metronome.soundType).toBe('synth');
});
```

- [ ] **Step 2: Run the tests to verify they fail.** Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/v2/cards/grid.ts`:
```ts
export type ColSpan = 3 | 4 | 6 | 12;

export const columnsForWidth = (px: number): 12 | 8 | 1 => (px >= 1200 ? 12 : px >= 768 ? 8 : 1);

export const clampSpan = (span: ColSpan, columns: number): number => Math.min(span, columns);
```

`src/v2/cards/metronome/MetronomeFace.tsx`:
```tsx
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square } from 'lucide-react';
import s from './Metronome.module.css';
import { useStore } from '../../../store/useStore';
import { Stepper, Button } from '../../ui';
import { BeatDots } from '../../shell/dock/BeatDots';
import { clampBpm, BPM_MIN, BPM_MAX } from '../../shell/dock/tapTempo';

export const MetronomeFace: React.FC = () => {
  const m = useStore(useShallow(st => ({
    bpm: st.metronome.bpm, beats: st.metronome.beatsPerMeasure, playing: st.metronome.isPlaying,
    setBpm: st.setBpm, setMetronomePlaying: st.setMetronomePlaying,
  })));
  return (
    <div className={s.face}>
      <BeatDots count={m.beats} size="md" />
      <div className={s.bpm}>{m.bpm}<span className={s.unit}>BPM</span></div>
      <Stepper label="Tempo" value={m.bpm} min={BPM_MIN} max={BPM_MAX} small={1} big={5}
        onChange={v => m.setBpm(clampBpm(v))} format={() => null} />
      <Button variant={m.playing ? 'secondary' : 'primary'} size="sm" aria-label={m.playing ? 'Stop' : 'Play'}
        onClick={() => m.setMetronomePlaying(!m.playing)}>
        {m.playing ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
        {m.playing ? 'Stop' : 'Play'}
      </Button>
    </div>
  );
};
```

`src/v2/cards/metronome/Metronome.module.css`:
```css
.face { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); }
.bpm { font-family: var(--font-mono); font-weight: 700; font-size: var(--text-48); line-height: 1; font-variant-numeric: tabular-nums; display: flex; flex-direction: column; align-items: center; }
.unit { font-family: var(--font-ui); font-size: var(--text-11); letter-spacing: .2em; color: var(--text-muted); font-weight: 600; margin-top: var(--space-1); }
.field { display: flex; flex-direction: column; gap: var(--space-2); }
.label { font-size: var(--text-12); color: var(--text-muted); }
.inline { display: flex; align-items: center; justify-content: space-between; }
```

`src/v2/cards/metronome/MetronomeSheet.tsx`:
```tsx
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Metronome.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Switch, Slider } from '../../ui';
import { SUBDIVISIONS, METERS } from '../../shell/dock/MeterPopover';
import { setClickVolume } from '../../../audio';

export const MetronomeSheet: React.FC = () => {
  const m = useStore(useShallow(st => ({
    beats: st.metronome.beatsPerMeasure, sub: st.metronome.subdivision, accent: st.metronome.emphasizeFirstBeat,
    sound: st.metronome.soundType, volume: st.metronome.volume, muted: st.metronome.muted,
    setBeatsPerMeasure: st.setBeatsPerMeasure, setSubdivision: st.setSubdivision,
    setEmphasizeFirstBeat: st.setEmphasizeFirstBeat, setMetronomeSoundType: st.setMetronomeSoundType,
    setMetronomeVolume: st.setMetronomeVolume, setMetronomeMuted: st.setMetronomeMuted,
  })));
  return (
    <>
      <div className={s.field}><span className={s.label}>Beats per bar</span>
        <SegmentedControl label="Beats per bar" value={String(m.beats)} onChange={v => m.setBeatsPerMeasure(Number(v))}
          options={METERS.map(x => ({ value: x, label: x }))} />
      </div>
      <div className={s.field}><span className={s.label}>Subdivision</span>
        <SegmentedControl label="Subdivision" value={m.sub} onChange={m.setSubdivision} options={SUBDIVISIONS} />
      </div>
      <div className={s.inline}><span className={s.label}>Accent first beat</span>
        <Switch label="Accent first beat" checked={m.accent} onChange={m.setEmphasizeFirstBeat} />
      </div>
      <div className={s.field}><span className={s.label}>Sound</span>
        <SegmentedControl label="Sound" value={m.sound} onChange={m.setMetronomeSoundType}
          options={[{ value: 'asrx', label: 'Block' }, { value: 'synth', label: 'Synth' }]} />
      </div>
      <div className={s.inline}><span className={s.label}>Click on</span>
        <Switch label="Click on" checked={!m.muted} onChange={v => m.setMetronomeMuted(!v)} />
      </div>
      <div className={s.field}><span className={s.label}>Click volume</span>
        <Slider label="Click volume" value={m.volume} min={0} max={100} showValue format={v => `${v}%`}
          onChange={v => { m.setMetronomeVolume(v); setClickVolume(v / 100); }} />
      </div>
    </>
  );
};
```

`src/v2/cards/registry.ts`:
```ts
import type React from 'react';
import type { ColSpan } from './grid';
import { MetronomeFace } from './metronome/MetronomeFace';
import { MetronomeSheet } from './metronome/MetronomeSheet';

export interface CardDef {
  id: string;
  title: string;
  description: string;
  size: { colSpan: ColSpan; rowSpan: number };
  follows: Array<'key' | 'tempo'>;
  Face: React.FC;
  Sheet?: React.FC;
}

// Cards are added here as each one passes its review (spec §7.3).
export const CARDS: CardDef[] = [
  {
    id: 'metronome',
    title: 'Metronome',
    description: 'Beat, tempo and click, driven by the shared clock.',
    size: { colSpan: 3, rowSpan: 6 },
    follows: ['tempo'],
    Face: MetronomeFace,
    Sheet: MetronomeSheet,
  },
];

export const getCard = (id: string): CardDef | undefined => CARDS.find(c => c.id === id);
```

`src/v2/cards/CardFrame.tsx`:
```tsx
import React from 'react';
import { Settings } from 'lucide-react';
import s from './CardFrame.module.css';
import type { CardDef } from './registry';
import { Chip, IconButton } from '../ui';

interface Props {
  def: CardDef;
  editing: boolean;
  onOpenSheet(): void;
  menu?: React.ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

const FOLLOWS_LABEL = (f: CardDef['follows']) =>
  f.length === 2 ? 'follows key · tempo' : f[0] ? `follows ${f[0]}` : '';

export const CardFrame: React.FC<Props> = ({ def, editing, onOpenSheet, menu, dragHandleProps }) => {
  const { Face } = def;
  return (
    <article className={[s.card, editing ? s.editing : ''].join(' ')} aria-label={def.title}>
      <header className={s.head} {...dragHandleProps}>
        <h3 className={s.title}>{def.title}</h3>
        <div className={s.tools}>
          {def.follows.length > 0 && <Chip>{FOLLOWS_LABEL(def.follows)}</Chip>}
          {def.Sheet && (
            <IconButton size="sm" label={`${def.title} settings`} active={editing} icon={<Settings size={14} />}
              onPointerDown={e => e.stopPropagation()} onClick={onOpenSheet} />
          )}
          {menu}
        </div>
      </header>
      <div className={s.face}><Face /></div>
    </article>
  );
};
```

`src/v2/cards/CardFrame.module.css`:
```css
.card { height: 100%; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--elev-1); min-width: 0; overflow: hidden; }
.editing { border-color: var(--accent); box-shadow: var(--focus-ring); }
.head { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-2) var(--space-1) var(--space-3); cursor: grab; touch-action: none; }
.head:active { cursor: grabbing; }
.title { font-family: var(--font-ui); font-size: var(--text-11); letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
.tools { margin-left: auto; display: flex; align-items: center; gap: var(--space-1); }
.face { flex: 1; min-height: 0; padding: var(--space-2) var(--space-3) var(--space-3); }
```

- [ ] **Step 4: Run the tests.** `CI=true npx react-scripts test --watchAll=false src/v2 && npx tsc --noEmit -p .`. Expected: PASS.

- [ ] **Step 5: Checkpoint.** Ask whether to commit (`feat(v2): card registry, grid rules, card frame, metronome card`).

---

### Task 10: Practice page (workspace tabs, grid, drag reorder, add card, side sheet)

**Files:**
- Create: `src/v2/pages/PracticePage.tsx` + `PracticePage.module.css`
- Create: `src/v2/pages/WorkspaceTabs.tsx`
- Create: `src/v2/pages/CardGrid.tsx`
- Create: `src/v2/pages/AddCardDialog.tsx`
- Create: `src/v2/cards/CardSheetHost.tsx`
- Create: `src/v2/pages/CardMenu.tsx`
- Modify: `src/v2/V2App.tsx` (index → `PracticePage`, `sheetHost={<CardSheetHost/>}`)
- Test: `src/v2/pages/PracticePage.test.tsx`

**Interfaces:**
- Consumes: `useV2Store` (Task 3), `CARDS` / `getCard` / `CardFrame` / `clampSpan` / `columnsForWidth` (Task 9), kit, `@dnd-kit`.
- Produces: `<PracticePage/>`, `<CardSheetHost/>`.

- [ ] **Step 1: Write the failing test**

`src/v2/pages/PracticePage.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { PracticePage } from './PracticePage';
import { CardSheetHost } from '../cards/CardSheetHost';
import { ToastHost } from '../shell/ToastHost';
import { useV2Store } from '../state/useV2Store';

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});
beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

const App = () => (<><PracticePage /><CardSheetHost /><ToastHost /></>);
const v2 = () => useV2Store.getState();

it('renders workspace tabs and only registered cards of the active workspace', () => {
  render(<App />);
  expect(screen.getByRole('tab', { name: 'Warm-up' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('article', { name: 'Metronome' })).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'Timer' })).toBeNull(); // not yet in registry: hidden, kept
  expect(v2().workspaces[0].cards).toContain('timer');
});

it('shows the empty state for a workspace with no registered cards', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('tab', { name: 'Theory' }));
  expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  // Both the toolbar and the empty state offer "Add card"; either opens the picker.
  fireEvent.click(screen.getAllByRole('button', { name: 'Add card' })[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Add card' })).getByRole('button', { name: /Metronome/ }));
  expect(screen.getByRole('article', { name: 'Metronome' })).toBeInTheDocument();
});

it('opens a card sheet, and removing that card closes the sheet and offers undo', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }));
  expect(screen.getByRole('dialog', { name: 'Metronome' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Metronome options' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
  expect(screen.queryByRole('dialog', { name: 'Metronome' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('article', { name: 'Metronome' })).toBeInTheDocument();
});

it('switching workspace closes an open sheet', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Jam' }));
  expect(screen.queryByRole('dialog', { name: 'Metronome' })).toBeNull();
});

it('creates a workspace and renames it inline', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));
  const input = screen.getByRole('textbox', { name: 'Workspace name' });
  fireEvent.change(input, { target: { value: 'Scales warm-up' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('tab', { name: 'Scales warm-up' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/v2/cards/CardSheetHost.tsx`:
```tsx
import React from 'react';
import { SideSheet } from '../ui';
import { useV2Store } from '../state/useV2Store';
import { getCard } from './registry';

/** Renders the open card's Sheet. Closes itself if the card is gone (removed,
 *  unregistered, or not in the active workspace). */
export const CardSheetHost: React.FC = () => {
  const overlay = useV2Store(s => s.overlay);
  const setOverlay = useV2Store(s => s.setOverlay);
  const active = useV2Store(s => s.workspaces.find(w => w.id === s.activeWorkspaceId));
  const cardId = overlay?.kind === 'cardSheet' ? overlay.cardId : null;
  const def = cardId ? getCard(cardId) : undefined;
  const valid = !!def?.Sheet && !!active?.cards.includes(cardId!);
  if (!cardId || !valid) return null;
  const Sheet = def!.Sheet!;
  return (
    <SideSheet open onClose={() => setOverlay(null)} title={def!.title}>
      <Sheet />
    </SideSheet>
  );
};
```

`src/v2/pages/CardMenu.tsx`:
```tsx
import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from '../ui';
import { useV2Store } from '../state/useV2Store';
import s from './PracticePage.module.css';

export const CardMenu: React.FC<{ cardId: string; title: string }> = ({ cardId, title }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { workspaces, activeWorkspaceId, removeCard, moveCardToWorkspace } = useV2Store();
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className={s.menuWrap} onPointerDown={e => e.stopPropagation()}>
      <IconButton size="sm" label={`${title} options`} icon={<MoreHorizontal size={14} />} onClick={() => setOpen(o => !o)} />
      {open && (
        <div role="menu" className={s.menu}>
          <button role="menuitem" className={s.menuItem} onClick={() => { setOpen(false); removeCard(activeWorkspaceId, cardId); }}>Remove</button>
          {workspaces.filter(w => w.id !== activeWorkspaceId).map(w => (
            <button key={w.id} role="menuitem" className={s.menuItem}
              onClick={() => { setOpen(false); moveCardToWorkspace(cardId, activeWorkspaceId, w.id); }}>
              Move to {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

`src/v2/pages/CardGrid.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import s from './PracticePage.module.css';
import { CardFrame } from '../cards/CardFrame';
import { CardDef } from '../cards/registry';
import { clampSpan, columnsForWidth } from '../cards/grid';
import { useV2Store } from '../state/useV2Store';
import { CardMenu } from './CardMenu';

const useColumns = () => {
  const [cols, setCols] = useState(() => columnsForWidth(window.innerWidth));
  useEffect(() => {
    const onResize = () => setCols(columnsForWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
};

const SortableCard: React.FC<{ def: CardDef; columns: number }> = ({ def, columns }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: def.id });
  const overlay = useV2Store(st => st.overlay);
  const setOverlay = useV2Store(st => st.setOverlay);
  const editing = overlay?.kind === 'cardSheet' && overlay.cardId === def.id;
  return (
    <div ref={setNodeRef} className={s.cell}
      style={{
        gridColumn: `span ${clampSpan(def.size.colSpan, columns)}`,
        gridRow: `span ${def.size.rowSpan}`,
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : undefined,
      }}>
      <CardFrame def={def} editing={editing}
        onOpenSheet={() => setOverlay(editing ? null : { kind: 'cardSheet', cardId: def.id })}
        menu={<CardMenu cardId={def.id} title={def.title} />}
        dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

export const CardGrid: React.FC<{ workspaceId: string; cards: CardDef[] }> = ({ workspaceId, cards }) => {
  const columns = useColumns();
  const allIds = useV2Store(st => st.workspaces.find(w => w.id === workspaceId)?.cards ?? []);
  const moveCard = useV2Store(st => st.moveCard);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    // Indices in the stored list (which may contain hidden, unregistered ids).
    moveCard(workspaceId, allIds.indexOf(String(active.id)), allIds.indexOf(String(over.id)));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className={s.grid} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {cards.map(def => <SortableCard key={def.id} def={def} columns={columns} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
};
```

`src/v2/pages/AddCardDialog.tsx`:
```tsx
import React from 'react';
import s from './PracticePage.module.css';
import { Dialog } from '../ui';
import { CARDS } from '../cards/registry';
import { useV2Store } from '../state/useV2Store';

const SIZE_LABEL: Record<number, string> = { 3: 'Small', 4: 'Medium', 6: 'Large', 12: 'Full width' };

export const AddCardDialog: React.FC<{ open: boolean; onClose(): void }> = ({ open, onClose }) => {
  const active = useV2Store(st => st.workspaces.find(w => w.id === st.activeWorkspaceId)!);
  const addCard = useV2Store(st => st.addCard);
  const available = CARDS.filter(c => !active.cards.includes(c.id));
  return (
    <Dialog open={open} onClose={onClose} title="Add card">
      {available.length === 0 ? <p className={s.muted}>Every available card is already in this workspace.</p> : (
        <div className={s.pickList}>
          {available.map(c => (
            <button key={c.id} type="button" className={s.pickItem} onClick={() => { addCard(active.id, c.id); onClose(); }}>
              <span className={s.pickTitle}>{c.title}</span>
              <span className={s.muted}>{c.description}</span>
              <span className={s.pickSize}>{SIZE_LABEL[c.size.colSpan]}</span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
};
```

`src/v2/pages/WorkspaceTabs.tsx`:
```tsx
import React, { useState } from 'react';
import { Plus, Copy, RotateCcw, Trash2, Pencil } from 'lucide-react';
import s from './PracticePage.module.css';
import { Tabs, IconButton, Button } from '../ui';
import { useV2Store } from '../state/useV2Store';

export const WorkspaceTabs: React.FC<{ onAddCard(): void }> = ({ onAddCard }) => {
  const st = useV2Store();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const active = st.workspaces.find(w => w.id === st.activeWorkspaceId)!;

  const startRename = (id: string, name: string) => { setRenaming(id); setDraft(name); };
  const commit = () => { if (renaming) st.renameWorkspace(renaming, draft); setRenaming(null); };

  return (
    <div className={s.tabsRow}>
      <Tabs label="Workspaces" activeId={st.activeWorkspaceId} onSelect={st.setActiveWorkspace}
        items={st.workspaces.map(w => ({ id: w.id, label: w.name }))}
        renderItem={(item, _active, node) => item.id === renaming ? (
          <input autoFocus aria-label="Workspace name" className={s.renameInput} value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit(); if (e.key === 'Escape') setRenaming(null); }} />
        ) : (
          <span onDoubleClick={() => startRename(item.id, String(item.label))}>{node}</span>
        )}
        trailing={
          <IconButton size="sm" label="New workspace" icon={<Plus size={14} />}
            onClick={() => { const id = st.addWorkspace(); st.setActiveWorkspace(id); startRename(id, 'New workspace'); }} />
        } />
      <div className={s.tabTools}>
        <IconButton size="sm" label="Rename workspace" icon={<Pencil size={14} />} onClick={() => startRename(active.id, active.name)} />
        <IconButton size="sm" label="Duplicate workspace" icon={<Copy size={14} />}
          onClick={() => st.setActiveWorkspace(st.duplicateWorkspace(active.id))} />
        {active.builtIn
          ? <IconButton size="sm" label="Reset workspace" icon={<RotateCcw size={14} />} onClick={() => st.resetWorkspace(active.id)} />
          : <IconButton size="sm" label="Delete workspace" icon={<Trash2 size={14} />} onClick={() => st.removeWorkspace(active.id)} />}
        <Button size="sm" onClick={onAddCard}><Plus size={14} />Add card</Button>
      </div>
    </div>
  );
};
```

`src/v2/pages/PracticePage.tsx`:
```tsx
import React, { useState } from 'react';
import s from './PracticePage.module.css';
import { WorkspaceTabs } from './WorkspaceTabs';
import { CardGrid } from './CardGrid';
import { AddCardDialog } from './AddCardDialog';
import { Button } from '../ui';
import { useV2Store } from '../state/useV2Store';
import { getCard, CardDef } from '../cards/registry';

export const PracticePage: React.FC = () => {
  const active = useV2Store(st => st.workspaces.find(w => w.id === st.activeWorkspaceId)!);
  const resetWorkspace = useV2Store(st => st.resetWorkspace);
  const addCard = useV2Store(st => st.addCard);
  const [adding, setAdding] = useState(false);
  // Unregistered ids stay in storage but aren't rendered (see plan: Global Constraints).
  const cards = active.cards.map(getCard).filter((c): c is CardDef => !!c);

  return (
    <main className={s.page}>
      <WorkspaceTabs onAddCard={() => setAdding(true)} />
      {cards.length === 0 ? (
        <div className={s.empty}>
          <h2>Nothing here yet</h2>
          <p className={s.muted}>Add the tools you want for this session.</p>
          <div className={s.emptyActions}>
            <Button variant="primary" onClick={() => setAdding(true)}>Add card</Button>
            <Button onClick={() => (active.builtIn ? resetWorkspace(active.id) : addCard(active.id, 'metronome'))}>Start from Warm-up</Button>
          </div>
        </div>
      ) : (
        <CardGrid workspaceId={active.id} cards={cards} />
      )}
      <AddCardDialog open={adding} onClose={() => setAdding(false)} />
    </main>
  );
};
```
"Start from Warm-up" on a custom workspace copies the Warm-up card list. Replace the `addCard(active.id, 'metronome')` branch with:
```ts
() => BUILT_IN_WORKSPACES[0].cards.forEach(id => addCard(active.id, id))
```
and add `import { BUILT_IN_WORKSPACES } from '../state/builtInWorkspaces';`.

`src/v2/pages/PracticePage.module.css`:
```css
.page { max-width: 1440px; margin: 0 auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
.tabsRow { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.tabTools { margin-left: auto; display: flex; align-items: center; gap: var(--space-1); flex: none; }
.renameInput { height: 28px; border: 1px solid var(--accent); background: var(--surface); color: var(--text); border-radius: var(--radius-pill); padding: 0 var(--space-3); font: inherit; font-size: var(--text-12); width: 160px; }
.grid { display: grid; grid-auto-rows: var(--row-unit); grid-auto-flow: dense; gap: var(--grid-gap); }
.cell { min-width: 0; }
.empty { border: 1px dashed var(--line-strong); border-radius: var(--radius-lg); padding: var(--space-10) var(--space-4); display: flex; flex-direction: column; align-items: center; gap: var(--space-2); text-align: center; }
.emptyActions { display: flex; gap: var(--space-2); margin-top: var(--space-3); }
.muted { color: var(--text-muted); }
.menuWrap { position: relative; }
.menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 10; min-width: 180px; background: var(--surface-raised); border: 1px solid var(--line-strong); border-radius: var(--radius-md); box-shadow: var(--elev-2); padding: var(--space-1); display: flex; flex-direction: column; }
.menuItem { text-align: left; border: none; background: transparent; color: var(--text); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); cursor: pointer; font-size: var(--text-12); }
.menuItem:hover { background: var(--fill); }
.pickList { display: flex; flex-direction: column; gap: var(--space-2); }
.pickItem { display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'title size' 'desc size'; text-align: left; gap: 2px var(--space-3); border: 1px solid var(--line); background: var(--surface); color: var(--text); border-radius: var(--radius-md); padding: var(--space-3); cursor: pointer; }
.pickItem:hover { border-color: var(--accent); }
.pickTitle { grid-area: title; font-weight: 600; }
.pickItem .muted { grid-area: desc; font-size: var(--text-12); }
.pickSize { grid-area: size; align-self: center; font-size: var(--text-11); color: var(--text-muted); }
@media (max-width: 767px) { .tabsRow { flex-wrap: wrap; } .tabTools { margin-left: 0; } }
```

`src/v2/V2App.tsx`: index route → `<PracticePage />`, and `<V2Layout dock={<Dock />} sheetHost={<CardSheetHost />} />`.

- [ ] **Step 4: Run the tests.** `CI=true npx react-scripts test --watchAll=false src/v2 && npx tsc --noEmit -p .`. Expected: PASS.

- [ ] **Step 5: Manual check.**
  - The Warm-up workspace shows the Metronome card.
  - ⚙ opens the side sheet with the card highlighted, and changes apply live.
  - Drag the card by its header (add a second card via a duplicate workspace to test).
  - Removing a card shows an Undo toast.
  - Tabs: rename (double-click or ✎), duplicate, delete a custom one with Undo, reset a built-in.
  - Try widths above 1200px, 768–1199px and below 768px, where the sheet becomes a bottom sheet.
  - Reloading keeps everything.

- [ ] **Step 6: Checkpoint.** Ask whether to commit (`feat(v2): practice page with workspaces, grid, sheets`).

---

### Task 11: Token fallbacks on reused visual components

**Files:**
- Modify: `src/components/Fretboard/Fretboard.css` (lines 94, 151, 166–168, 180, 191, 210, 268–271, 301–302, 354, 400, 443, 476–477)
- Modify: `src/components/PianoKeyboard/PianoKeyboard.css` (lines 32, 77–78, 88, 100, 105, 109, 138, 158, 217)
- Modify: `src/components/MelodyStaff/MelodyStaff.css` (lines 18–19, 27–28)
- Create: `src/v2/styles/legacyBridge.css`
- Modify: `src/v2/theme/ThemeRoot.tsx` (import the bridge)
- Test: `src/v2/__tests__/legacyBridge.test.ts`

**Interfaces:**
- Produces these CSS custom properties, which reused components read with their v1 values as fallbacks:
  - `--fb-wood`, `--fb-wood-dark`, `--fb-fret`, `--fb-fret-hi`, `--fb-string`, `--fb-inlay`, `--fb-shadow`
  - `--pk-white-top`, `--pk-white-bottom`, `--pk-white-border`, `--pk-white-hover-top`, `--pk-white-hover-bottom`, `--pk-black-top`, `--pk-black-bottom`, `--pk-black-hover-top`, `--pk-black-hover-bottom`, `--pk-shadow`
  - `--ms-correct`, `--ms-current`
- `legacyBridge.css` sets them (and `--ds-color-primary` / `--ds-color-secondary` / `--ds-color-warning`, which the Fretboard dot variants use) under `.gp2`.

- [ ] **Step 1: Write the failing test**

`src/v2/__tests__/legacyBridge.test.ts`:
```ts
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '../../', p), 'utf8');

it('reused components read bridge variables with v1 fallbacks', () => {
  const fb = read('components/Fretboard/Fretboard.css');
  expect(fb).toMatch(/var\(--fb-wood, #6b4a2b\)/);
  const pk = read('components/PianoKeyboard/PianoKeyboard.css');
  expect(pk).toMatch(/var\(--pk-white-top, #fdfdfd\)/);
  const ms = read('components/MelodyStaff/MelodyStaff.css');
  expect(ms).toMatch(/var\(--ms-correct, #3cc85a\)/);
});

it('the bridge only styles inside .gp2', () => {
  const css = read('v2/styles/legacyBridge.css');
  const selectors = css.split('}').map(b => b.split('{')[0].trim()).filter(Boolean);
  selectors.forEach(sel => expect(sel.startsWith('.gp2')).toBe(true));
});
```

- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL (patterns not found, bridge missing).

- [ ] **Step 3: Implement**
  - In the three v1 CSS files, wrap each literal listed under **Files** in a `var(--name, <original literal>)` using the names above. Keep the original literal as the fallback so v1 renders byte-for-byte the same colors. For example, `background: linear-gradient(#6b4a2b, #4a2e16, #6b4a2b)` becomes `background: linear-gradient(var(--fb-wood, #6b4a2b), var(--fb-wood-dark, #4a2e16), var(--fb-wood, #6b4a2b))`.
  - Map each literal to its role by reading the surrounding selector: board wood, fret wire, string, inlay, key face and so on. Shadows `rgba(0,0,0,x)` all become `var(--fb-shadow, rgba(0,0,0,x))` / `var(--pk-shadow, …)`.

`src/v2/styles/legacyBridge.css`:
```css
/* Re-themes reused v1 visual components inside v2. v1 keeps its original
   colors through the var() fallbacks in those components' own CSS. */
.gp2 {
  --ds-color-primary: var(--note-root);
  --ds-color-secondary: var(--note-chord);
  --ds-color-warning: var(--note-scale);
  --ms-correct: var(--success);
  --ms-current: var(--accent);
  --pk-shadow: var(--elev-2);
}
.gp2[data-theme='dark'] {
  --fb-wood: #2a2433; --fb-wood-dark: #1f1a27; --fb-fret: #6d6580; --fb-fret-hi: #a49cb5;
  --fb-string: #b9b2c7; --fb-inlay: #3a3446; --fb-shadow: #00000066;
  --pk-white-top: #ece9f2; --pk-white-bottom: #d9d4e2; --pk-white-border: #9f98ad;
  --pk-white-hover-top: #ffffff; --pk-white-hover-bottom: #e8e4ef;
  --pk-black-top: #221e2b; --pk-black-bottom: #14121a; --pk-black-hover-top: #2e2939; --pk-black-hover-bottom: #1b1822;
}
.gp2[data-theme='light'] {
  --fb-wood: #efe7da; --fb-wood-dark: #e2d6c2; --fb-fret: #a79b88; --fb-fret-hi: #cfc4b2;
  --fb-string: #8a7f70; --fb-inlay: #d9cdb9; --fb-shadow: #1c182433;
  --pk-white-top: #ffffff; --pk-white-bottom: #f3f0f7; --pk-white-border: #d4cde0;
  --pk-white-hover-top: #fffdf5; --pk-white-hover-bottom: #efeaf6;
  --pk-black-top: #2a2433; --pk-black-bottom: #14121a; --pk-black-hover-top: #3a3446; --pk-black-hover-bottom: #221e2b;
}
```
Add `import '../styles/legacyBridge.css';` to `ThemeRoot.tsx`. This file is not a CSS module, so the hygiene test (which covers `*.module.css` only) allows its literals by design: these are theme values in the same role as `tokens.ts`.

- [ ] **Step 4: Run the tests.** `CI=true npx react-scripts test --watchAll=false src && npx tsc --noEmit -p .`. Expected: PASS, and the existing v1 Fretboard/GrandStaff tests still pass.

- [ ] **Step 5: Manual check.** v1 `/` looks unchanged; compare the fretboard and piano side by side before and after.

- [ ] **Step 6: Checkpoint.** Ask whether to commit (`refactor: token fallbacks on reused fretboard/piano/staff`).

---

### Task 12: Learn home and article template with one sample article

**Files:**
- Create: `src/v2/learn/types.ts`
- Create: `src/v2/learn/articles/index.ts`
- Create: `src/v2/learn/articles/major-scale.ts`
- Create: `src/v2/learn/blocks/BlockRenderer.tsx` + `Blocks.module.css`
- Create: `src/v2/learn/LearnHome.tsx`
- Create: `src/v2/learn/ArticlePage.tsx`
- Create: `src/v2/learn/Learn.module.css`
- Modify: `src/v2/V2App.tsx` (routes `learn`, `learn/:slug`)
- Test: `src/v2/learn/Learn.test.tsx`

**Interfaces:**
- Consumes:
  - `useV2Store`: `learnProgress`, `markRead`, `setActiveWorkspace`
  - `useStore`: `setSelectedNote`, `setSelectedScale`, `setBpm`
  - `getScaleNotes` from `src/data/musicData`
  - `playPianoNote` from `src/audio/piano`
- Produces:
```ts
export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; tone: 'tip' | 'note'; text: string }
  | { type: 'example'; kind: 'scale'; root: string; scale: string; caption?: string }
  | { type: 'tryIt'; label: string; set: { key?: string; scale?: string; bpm?: number }; workspaceId: string };
export interface Article { slug: string; chapter: string; title: string; summary: string; minutes: number; blocks: Block[] }
export const ARTICLES: Article[];
export const getArticle = (slug: string) => Article | undefined;
export const slugify = (text: string) => string;
```

- [ ] **Step 1: Write the failing test**

`src/v2/learn/Learn.test.tsx`:
```tsx
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LearnHome } from './LearnHome';
import { ArticlePage } from './ArticlePage';
import { useV2Store } from '../state/useV2Store';
import { useStore } from '../../store/useStore';
import { ARTICLES, slugify } from './articles';

jest.mock('../../audio/piano', () => ({ playPianoNote: jest.fn() }));

beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

const at = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/v2/learn" element={<LearnHome />} />
      <Route path="/v2/learn/:slug" element={<ArticlePage />} />
      <Route path="/v2" element={<p>practice page</p>} />
    </Routes>
  </MemoryRouter>,
);

it('home lists articles by chapter with read state and a continue card', () => {
  at('/v2/learn');
  expect(screen.getByRole('heading', { name: ARTICLES[0].chapter })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: new RegExp(ARTICLES[0].title) })).toBeInTheDocument();
  expect(screen.getByText(/start here/i)).toBeInTheDocument();
});

it('article renders blocks and a table of contents, and marks itself read', () => {
  at(`/v2/learn/${ARTICLES[0].slug}`);
  expect(screen.getByRole('heading', { level: 1, name: ARTICLES[0].title })).toBeInTheDocument();
  const firstHeading = ARTICLES[0].blocks.find(b => b.type === 'heading') as { text: string };
  expect(screen.getByRole('link', { name: firstHeading.text })).toHaveAttribute('href', `#${slugify(firstHeading.text)}`);
  expect(useV2Store.getState().learnProgress[ARTICLES[0].slug]).toBeDefined();
});

it('"Try it in Practice" sets shared state and navigates to Practice', () => {
  at(`/v2/learn/${ARTICLES[0].slug}`);
  fireEvent.click(screen.getByRole('button', { name: /try it in practice/i }));
  expect(useStore.getState().note.selectedScale).toBe('Major (Ionian)');
  expect(screen.getByText('practice page')).toBeInTheDocument();
});

it('unknown slugs show a friendly not-found with a way back', () => {
  at('/v2/learn/nope');
  expect(screen.getByText(/couldn't find that article/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /all articles/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/v2/learn/types.ts`:
```ts
export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; tone: 'tip' | 'note'; text: string }
  | { type: 'example'; kind: 'scale'; root: string; scale: string; caption?: string }
  | { type: 'tryIt'; label: string; set: { key?: string; scale?: string; bpm?: number }; workspaceId: string };

export interface Article {
  slug: string;
  chapter: string;
  title: string;
  summary: string;
  minutes: number;
  blocks: Block[];
}
```

`src/v2/learn/articles/major-scale.ts`:
```ts
import type { Article } from '../types';

export const majorScale: Article = {
  slug: 'major-scale',
  chapter: 'Foundations',
  title: 'The major scale',
  summary: 'The seven-note pattern almost everything else is built from.',
  minutes: 4,
  blocks: [
    { type: 'paragraph', text: 'Nearly every scale, chord and key you will meet is described relative to the major scale. Learn its shape once and the rest of theory gets a lot less mysterious.' },
    { type: 'heading', text: 'Whole steps and half steps' },
    { type: 'paragraph', text: 'On guitar, one fret is a half step and two frets are a whole step. The major scale is the pattern whole, whole, half, whole, whole, whole, half.' },
    { type: 'example', kind: 'scale', root: 'C', scale: 'Major (Ionian)', caption: 'C major: no sharps or flats.' },
    { type: 'callout', tone: 'tip', text: 'Sing "do re mi fa sol la ti do" while you play it. You already know how the major scale sounds.' },
    { type: 'heading', text: 'Same pattern, any key' },
    { type: 'paragraph', text: 'Start the same pattern on G and you get G major, which needs one sharp (F♯) to keep the steps right.' },
    { type: 'example', kind: 'scale', root: 'G', scale: 'Major (Ionian)', caption: 'G major: one sharp.' },
    { type: 'tryIt', label: 'Try it in Practice', set: { key: 'G', scale: 'Major (Ionian)', bpm: 80 }, workspaceId: 'warm-up' },
  ],
};
```

`src/v2/learn/articles/index.ts`:
```ts
import type { Article } from '../types';
import { majorScale } from './major-scale';

export const ARTICLES: Article[] = [majorScale];

export const getArticle = (slug: string): Article | undefined => ARTICLES.find(a => a.slug === slug);

export const slugify = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
```

`src/v2/learn/blocks/BlockRenderer.tsx`:
```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Lightbulb, Info } from 'lucide-react';
import s from './Blocks.module.css';
import type { Block } from '../types';
import { slugify } from '../articles';
import { Button } from '../../ui';
import { getScaleNotes, scales } from '../../../data/musicData';
import { playPianoNote } from '../../../audio/piano';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';

const NOTE_PC: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

const ScaleExample: React.FC<{ root: string; scale: string; caption?: string }> = ({ root, scale, caption }) => {
  const notes = getScaleNotes(root, scale as keyof typeof scales);
  const play = () => {
    // Ascending from the root in octave 4.
    let midi = 60 + (NOTE_PC[root] ?? 0);
    let prev = -1;
    notes.forEach((n, i) => {
      const pc = NOTE_PC[n] ?? 0;
      if (i > 0 && pc <= prev) midi += 12;
      prev = pc;
      const noteMidi = midi - (NOTE_PC[root] ?? 0) + pc;
      setTimeout(() => void playPianoNote(noteMidi, 0.5), i * 280);
    });
  };
  return (
    <figure className={s.example}>
      <div className={s.notes}>
        {notes.map((n, i) => <span key={n + i} className={i === 0 ? s.root : s.note}>{n}</span>)}
        <Button size="sm" onClick={play}><Play size={12} />Hear it</Button>
      </div>
      {caption && <figcaption className={s.caption}>{caption}</figcaption>}
    </figure>
  );
};

export const BlockRenderer: React.FC<{ block: Block }> = ({ block }) => {
  const navigate = useNavigate();
  const shared = useStore.getState;
  const setActiveWorkspace = useV2Store(st => st.setActiveWorkspace);
  switch (block.type) {
    case 'heading': return <h2 id={slugify(block.text)} className={s.h2}>{block.text}</h2>;
    case 'paragraph': return <p className={s.p}>{block.text}</p>;
    case 'callout': return (
      <aside className={[s.callout, s[block.tone]].join(' ')}>
        {block.tone === 'tip' ? <Lightbulb size={16} /> : <Info size={16} />}<span>{block.text}</span>
      </aside>
    );
    case 'example': return <ScaleExample root={block.root} scale={block.scale} caption={block.caption} />;
    case 'tryIt': return (
      <div className={s.tryIt}>
        <Button variant="primary" onClick={() => {
          const st = shared();
          if (block.set.key) st.setSelectedNote(block.set.key);
          if (block.set.scale) st.setSelectedScale(block.set.scale);
          if (block.set.bpm) st.setBpm(block.set.bpm);
          setActiveWorkspace(block.workspaceId);
          navigate('/v2');
        }}>{block.label}</Button>
      </div>
    );
  }
};
```

`src/v2/learn/blocks/Blocks.module.css`:
```css
.h2 { font-size: var(--text-24); margin-top: var(--space-8); scroll-margin-top: 72px; }
.p { font-size: 17px; line-height: 1.6; color: var(--text); }
.callout { display: flex; gap: var(--space-3); align-items: flex-start; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--fill); border-left: 3px solid var(--accent); font-size: var(--text-16); }
.note { border-left-color: var(--note-chord); }
.example { margin: 0; padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface); display: flex; flex-direction: column; gap: var(--space-2); }
.notes { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.note, .root { min-width: 36px; text-align: center; padding: 6px 10px; border-radius: var(--radius-pill); background: var(--fill); font-weight: 700; }
.root { background: var(--note-root); color: var(--note-label); }
.caption { color: var(--text-muted); font-size: var(--text-12); }
.tryIt { margin-top: var(--space-6); }
```

`src/v2/learn/LearnHome.tsx`:
```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import s from './Learn.module.css';
import { ARTICLES } from './articles';
import { useV2Store } from '../state/useV2Store';

export const LearnHome: React.FC = () => {
  const progress = useV2Store(st => st.learnProgress);
  const next = ARTICLES.find(a => !progress[a.slug]) ?? ARTICLES[0];
  const started = ARTICLES.some(a => progress[a.slug]);
  const chapters = Array.from(new Set(ARTICLES.map(a => a.chapter)));
  return (
    <main className={s.home}>
      <h1 className={s.title}>Learn</h1>
      <Link to={`/v2/learn/${next.slug}`} className={s.continue}>
        <span className={s.eyebrow}>{started ? 'Continue where you left off' : 'Start here'}</span>
        <span className={s.continueTitle}>{next.title}</span>
        <span className={s.muted}>{next.summary}</span>
      </Link>
      {chapters.map(ch => (
        <section key={ch} className={s.chapter}>
          <h2 className={s.chapterTitle}>{ch}</h2>
          <ol className={s.list}>
            {ARTICLES.filter(a => a.chapter === ch).map(a => (
              <li key={a.slug}>
                <Link to={`/v2/learn/${a.slug}`} className={s.item}>
                  {progress[a.slug] ? <CheckCircle2 size={16} className={s.done} aria-label="Read" /> : <Circle size={16} className={s.muted} aria-label="Unread" />}
                  <span className={s.itemTitle}>{a.title}</span>
                  <span className={s.muted}>{a.minutes} min</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
};
```

`src/v2/learn/ArticlePage.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import s from './Learn.module.css';
import { ARTICLES, getArticle, slugify } from './articles';
import { BlockRenderer } from './blocks/BlockRenderer';
import { useV2Store } from '../state/useV2Store';

export const ArticlePage: React.FC = () => {
  const { slug = '' } = useParams();
  const article = getArticle(slug);
  const markRead = useV2Store(st => st.markRead);
  useEffect(() => { if (article) markRead(article.slug); }, [article, markRead]);

  if (!article) {
    return (
      <main className={s.article}>
        <p>We couldn't find that article.</p>
        <Link to="/v2/learn">All articles</Link>
      </main>
    );
  }
  const idx = ARTICLES.indexOf(article);
  const prev = ARTICLES[idx - 1];
  const next = ARTICLES[idx + 1];
  const headings = article.blocks.filter((b): b is { type: 'heading'; text: string } => b.type === 'heading');
  return (
    <div className={s.articleWrap}>
      <main className={s.article}>
        <Link to="/v2/learn" className={s.back}>← All articles</Link>
        <span className={s.eyebrow}>{article.chapter} · {article.minutes} min</span>
        <h1 className={s.title}>{article.title}</h1>
        <p className={s.lede}>{article.summary}</p>
        {article.blocks.map((b, i) => <BlockRenderer key={i} block={b} />)}
        <nav className={s.pager} aria-label="Article navigation">
          {prev ? <Link to={`/v2/learn/${prev.slug}`}>← {prev.title}</Link> : <span />}
          {next && <Link to={`/v2/learn/${next.slug}`}>{next.title} →</Link>}
        </nav>
      </main>
      {headings.length > 0 && (
        <aside className={s.toc} aria-label="On this page">
          <span className={s.eyebrow}>On this page</span>
          {headings.map(h => <a key={h.text} href={`#${slugify(h.text)}`}>{h.text}</a>)}
        </aside>
      )}
    </div>
  );
};
```

`src/v2/learn/Learn.module.css`:
```css
.home { max-width: 760px; margin: 0 auto; padding: var(--space-8) var(--space-4); display: flex; flex-direction: column; gap: var(--space-6); }
.title { font-size: var(--text-32); }
.eyebrow { font-size: var(--text-11); letter-spacing: .12em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
.muted { color: var(--text-muted); }
.continue { display: flex; flex-direction: column; gap: var(--space-1); text-decoration: none; padding: var(--space-5); border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--line); box-shadow: var(--elev-1); }
.continue:hover { border-color: var(--accent); }
.continueTitle { font-family: var(--font-display); font-size: var(--text-20); font-weight: 700; }
.chapter { display: flex; flex-direction: column; gap: var(--space-2); }
.chapterTitle { font-size: var(--text-16); }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-2); border-bottom: 1px solid var(--line); text-decoration: none; }
.item:hover .itemTitle { color: var(--accent); }
.itemTitle { flex: 1; font-weight: 500; }
.done { color: var(--success); }
.articleWrap { max-width: 1040px; margin: 0 auto; padding: var(--space-8) var(--space-4); display: grid; grid-template-columns: minmax(0, 68ch) 200px; gap: var(--space-10); justify-content: center; }
.article { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.back { color: var(--text-muted); text-decoration: none; font-size: var(--text-12); }
.lede { font-size: var(--text-20); color: var(--text-muted); line-height: 1.5; }
.pager { display: flex; justify-content: space-between; margin-top: var(--space-10); padding-top: var(--space-4); border-top: 1px solid var(--line); }
.pager a { text-decoration: none; font-weight: 600; }
.toc { position: sticky; top: 80px; align-self: start; display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--text-12); }
.toc a { color: var(--text-muted); text-decoration: none; } .toc a:hover { color: var(--text); }
@media (max-width: 1023px) { .articleWrap { grid-template-columns: minmax(0, 68ch); } .toc { display: none; } }
```

`src/v2/V2App.tsx`: add `<Route path="learn" element={<LearnHome />} />` and `<Route path="learn/:slug" element={<ArticlePage />} />` inside the layout route.

- [ ] **Step 4: Run the tests.** `CI=true npx react-scripts test --watchAll=false src/v2 && npx tsc --noEmit -p .`. Expected: PASS, and the brand test passes (no brand literal in article copy).

- [ ] **Step 5: Manual check.**
  - `/v2/learn` shows "Start here". The article reads comfortably in both themes and the table of contents jumps to headings.
  - "Hear it" plays the scale.
  - "Try it in Practice" sets G major at 80 BPM, opens Warm-up, and the dock reflects it.
  - Back on Learn home, the article is ticked.

- [ ] **Step 6: Checkpoint.** Ask whether to commit (`feat(v2): learn home, article template, sample article`).

---

### Task 13: Read route and final verification

**Files:**
- Create: `src/v2/pages/ReadPage.tsx` + `ReadPage.module.css`
- Modify: `src/v2/V2App.tsx` (route `read`, final route table)
- Test: `src/v2/pages/ReadPage.test.tsx`

**Interfaces:**
- Consumes: `NoteReading` from `src/components/NoteReading` (the allowed exception, spec §8).
- Produces: `<ReadPage/>`.

- [ ] **Step 1: Write the failing test**

`src/v2/pages/ReadPage.test.tsx`:
```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../components/NoteReading', () => ({ NoteReading: () => <div>note reading</div> }));
// eslint-disable-next-line import/first
import { ReadPage } from './ReadPage';

it('hosts the existing sight-reading experience on a paper surface', () => {
  render(<ReadPage />);
  expect(screen.getByRole('heading', { name: 'Read' })).toBeInTheDocument();
  expect(screen.getByText('note reading')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails.** Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`src/v2/pages/ReadPage.tsx`:
```tsx
import React from 'react';
import s from './ReadPage.module.css';
import { NoteReading } from '../../components/NoteReading';

/** Temporary host for v1 sight reading until its v2 rebuild (spec §10).
 *  Staff notation is drawn black by VexFlow, so it sits on a light "paper"
 *  surface in both themes. */
export const ReadPage: React.FC = () => (
  <main className={s.page}>
    <h1 className={s.title}>Read</h1>
    <div className={s.paper}><NoteReading /></div>
  </main>
);
```

`src/v2/pages/ReadPage.module.css`:
```css
.page { max-width: 1100px; margin: 0 auto; padding: var(--space-6) var(--space-4); display: flex; flex-direction: column; gap: var(--space-4); }
.title { font-size: var(--text-32); }
.paper { background: var(--pk-white-top); color: var(--text-inverse); border-radius: var(--radius-lg); padding: var(--space-4); box-shadow: var(--elev-2); }
```
(`--pk-white-top` comes from the legacy bridge. It's a near-white "paper" in both themes, so VexFlow's black staff stays readable.)

Final `src/v2/V2App.tsx`:
```tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeRoot } from './theme/ThemeRoot';
import { useV2Store } from './state/useV2Store';
import { V2Layout } from './shell/V2Layout';
import { Dock } from './shell/dock/Dock';
import { CardSheetHost } from './cards/CardSheetHost';
import { PracticePage } from './pages/PracticePage';
import { KitPage } from './pages/KitPage';
import { ReadPage } from './pages/ReadPage';
import { LearnHome } from './learn/LearnHome';
import { ArticlePage } from './learn/ArticlePage';

const V2App: React.FC = () => {
  const themeMode = useV2Store(s => s.themeMode);
  return (
    <ThemeRoot mode={themeMode}>
      <Routes>
        <Route path="kit" element={<KitPage />} />
        <Route element={<V2Layout dock={<Dock />} sheetHost={<CardSheetHost />} />}>
          <Route index element={<PracticePage />} />
          <Route path="learn" element={<LearnHome />} />
          <Route path="learn/:slug" element={<ArticlePage />} />
          <Route path="read" element={<ReadPage />} />
          <Route path="*" element={<Navigate to="/v2" replace />} />
        </Route>
      </Routes>
    </ThemeRoot>
  );
};

export default V2App;
```

- [ ] **Step 4: Full verification.**
  - Run: `CI=true npx react-scripts test --watchAll=false src`. Expected: all suites pass. The one exception is the pre-existing `App.test.tsx` failure (missing `react-router-dom` in its test environment), which fails the same way on `develop`; confirm with `git stash` if unsure.
  - Run: `npx tsc --noEmit -p .`. Expected: clean.
  - Run: `npx eslint src/v2`. Expected: no errors.
  - Run: `BUILD_PATH=/tmp/gp2-build npx react-scripts build`. Expected: "Compiled" (existing warnings only). The `/v2` code is emitted as a separate chunk. Delete `/tmp/gp2-build` afterwards.

- [ ] **Step 5: Manual browser pass (report each item's result to the user):**
  1. `/v2` in dark, light and system, at widths above 1200px, around 900px and 375px.
  2. Dock: play/stop, beat dots, all three pop-ups, tap tempo, Space/↑/↓/K (and not while renaming a workspace).
  3. Metronome card: face controls and side sheet live changes. Only one sheet at a time.
  4. Workspaces: add, rename, duplicate, delete with Undo, reset a built-in, drag-reorder cards, reload persistence.
  5. Learn: home, article, table of contents, "Hear it", "Try it in Practice".
  6. Read: sight reading works inside the v2 shell.
  7. `/` (v1) is unchanged, and shared state (key/tempo) is consistent between `/` and `/v2`.

- [ ] **Step 6: Checkpoint.** Summarize and ask whether to commit (`feat(v2): read route; v2 foundation complete`).

---

## Self-review notes

- **Spec coverage:**
  - §3 architecture/reuse/isolation: Tasks 2 and 11
  - §3.4 store: Task 3
  - §4 foundation: Tasks 1, 2 and 11 (sound identity §4.5 is deferred; see below)
  - §5 kit and `/v2/kit`: Tasks 4–6
  - §6.1 top bar and settings: Task 7
  - §6.2 dock: Task 8
  - §6.3–6.4 practice and side sheet: Task 10
  - §6.5 view switch: deferred to the Fretboard/Harmony card reviews (no such card exists in this build)
  - §6.6 phone: CSS in Tasks 5, 7, 8 and 10
  - §7 registry, anatomy and Metronome: Task 9
  - §8 Learn and Read: Tasks 12–13
  - §9 tests: throughout
- **Deferred with reason:**
  - §4.5 UI sound set (correct/wrong/complete): no v2 feature in this build triggers them. They land with the Read rebuild and Learn quizzes.
  - §6.5 is card-specific.
  - Tell the user both of these at the final checkpoint.
