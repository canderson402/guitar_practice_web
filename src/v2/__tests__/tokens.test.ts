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
