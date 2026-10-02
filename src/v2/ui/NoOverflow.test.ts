import fs from 'fs';
import path from 'path';

const css = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const rule = (src: string, selector: string) => src.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

// Range inputs have a built-in minimum width (~130px). Without min-width: 0
// two sliders in a row push narrow panels wider than the screen.
it('sliders can shrink to fit narrow panels', () => {
  expect(rule(css('Slider.module.css'), '.range')).toMatch(/min-width:\s*0/);
  expect(rule(css('Slider.module.css'), '.row')).toMatch(/min-width:\s*0/);
});

it('the Jam mixer grid lets its slider columns shrink', () => {
  const mixer = rule(css('../cards/jam/Jam.module.css'), '.mixer');
  expect(mixer).toMatch(/grid-template-columns:[^;]*minmax\(0,/);
  expect(mixer).not.toMatch(/grid-template-columns:[^;]*\s1fr/);
});
