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
  const css = read('v2/styles/legacyBridge.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = css.split('}').map(b => b.split('{')[0].trim()).filter(Boolean);
  selectors.forEach(sel => expect(sel.startsWith('.gp2')).toBe(true));
});

it('Sight Reading draws notation in the theme\'s ink on the dark card (no light paper)', () => {
  const page = read('v2/sight/SightReading.module.css');
  expect(page).not.toMatch(/var\(--paper\)/);
  // VexFlow's black inherits from the SVG root; staff and ledger lines carry their own greys.
  const ink = read('v2/sight/notationInk.css');
  expect(ink).toMatch(/\.gp2 \.sight-ink svg \{[^}]*fill: currentColor;[^}]*stroke: currentColor;/);
  expect(ink).toMatch(/\.gp2 \.sight-ink svg \[fill="#999999"\]/);
  expect(ink).toMatch(/\.gp2 \.sight-ink svg \[stroke="#444"\]/);
});
