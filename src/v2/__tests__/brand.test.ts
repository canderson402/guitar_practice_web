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
