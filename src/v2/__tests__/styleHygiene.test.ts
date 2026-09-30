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

it('every selector in a v2 CSS module is scoped by a class (no global attribute/element rules)', () => {
  const root = path.join(__dirname, '..');
  const offenders = walk(root)
    .filter(f => f.endsWith('.module.css'))
    .flatMap(f => {
      const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
      const selectors = src.split('}').map(b => b.split('{')[0]).flatMap(s => s.split(','))
        .map(s => s.trim()).filter(s => s && !s.startsWith('@'));
      return selectors.filter(s => !s.includes('.')).map(s => `${path.relative(root, f)}: ${s}`);
    });
  expect(offenders).toEqual([]);
});

it('base.css element rules have zero specificity so component styles (e.g. selected states) always win', () => {
  const css = fs.readFileSync(path.join(__dirname, '../styles/base.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = css.split('}').map(b => b.split('{')[0]).flatMap(s => s.split(',')).map(s => s.trim())
    .filter(s => s && !s.startsWith('@') && s !== '.gp2');
  // Anything beyond the root rule must be wrapped in :where(.gp2), e.g. ":where(.gp2) button".
  expect(selectors.filter(s => !s.startsWith(':where(.gp2)'))).toEqual([]);
});

it('scale note chips sit in a 7-column grid so a standard scale fits one row', () => {
  const css = fs.readFileSync(path.join(__dirname, '../cards/scale/Scale.module.css'), 'utf8');
  expect(css).toMatch(/\.notes \{[^}]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/);
});

it('side sheets run the full window height (over the top bar and dock)', () => {
  const css = fs.readFileSync(path.join(__dirname, '../ui/SideSheet.module.css'), 'utf8');
  const sheet = css.match(/\.sheet \{([^}]*)\}/)![1];
  expect(sheet).toMatch(/top: 0;/);
  expect(sheet).toMatch(/bottom: 0;/);
  expect(sheet).toMatch(/z-index: 3\d;/); // above the dock (25) and top bar (20)
});

it('the focus indicator is an outline that follows each control\'s own rounding (never changes it)', () => {
  const css = fs.readFileSync(path.join(__dirname, '../styles/base.css'), 'utf8');
  const rule = css.match(/:focus-visible \{([^}]*)\}/)![1];
  expect(rule).toMatch(/outline: 2px solid var\(--accent\)/);
  expect(rule).not.toMatch(/border-radius/);
  expect(rule).not.toMatch(/box-shadow/);
});

it('gradient fills cover the full border box (no seam of the wrong colour at the edges)', () => {
  const root = path.join(__dirname, '..');
  const offenders = walk(root)
    .filter(f => f.endsWith('.module.css'))
    .flatMap(f => {
      const src = fs.readFileSync(f, 'utf8');
      return src.split('}').filter(b => b.includes('--gradient-signature') && !b.includes('background-origin: border-box'))
        .map(b => `${path.relative(root, f)}: ${b.split('{')[0].trim()}`);
    });
  expect(offenders).toEqual([]);
});
