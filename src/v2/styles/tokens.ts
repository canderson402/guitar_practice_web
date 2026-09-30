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
