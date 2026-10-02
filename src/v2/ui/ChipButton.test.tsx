import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { ChipButton } from './ChipButton';

it('is one chip button with its states built in (selected, drop target)', () => {
  render(<><ChipButton selected aria-pressed>On</ChipButton><ChipButton target>Over</ChipButton><ChipButton>Off</ChipButton></>);
  expect(screen.getByRole('button', { name: 'On' })).toHaveClass('chip', 'selected');
  expect(screen.getByRole('button', { name: 'Over' })).toHaveClass('chip', 'target');
  expect(screen.getByRole('button', { name: 'Off' })).not.toHaveClass('selected');
  expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute('type', 'button');
});

it('its states never change its size and draw on the chip itself', () => {
  const css = fs.readFileSync(path.join(__dirname, 'ChipButton.module.css'), 'utf8');
  // A constant 1px border: selected only recolors it, so nothing shifts or shows through a gap.
  expect(css).toMatch(/\.chip \{[^}]*border: 1px solid transparent;/);
  expect(css).toMatch(/\.selected[^{]*\{[^}]*border-color:/);
  // Drop target and focus rings are drawn INSIDE the chip, so a scrolling or
  // clipped container around it can never cut them off.
  expect(css).toMatch(/\.target \{[^}]*box-shadow: inset /);
  expect(css).toMatch(/\.chip:focus-visible \{[^}]*outline-offset: -/);
});

it('cards don\'t hand-roll selected chip backgrounds (they use ChipButton)', () => {
  const root = path.join(__dirname, '..', 'cards');
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  // The Circle's key wheel is a drawing, not a chip.
  const files = walk(root).filter(f => f.endsWith('.module.css') && !f.endsWith('Circle.module.css'));
  const offenders = files.flatMap(f => {
    const css = fs.readFileSync(f, 'utf8');
    return Array.from(css.matchAll(/(\.(?:on|optOn|cur|noteOn|current|selected)\b[^{]*)\{[^}]*background/g)).map(m => `${path.basename(f)}: ${m[1].trim()}`);
  });
  expect(offenders).toEqual([]);
});

it('no card or page stylesheet draws rings outside an element (they get clipped by scrolling containers)', () => {
  const roots = [path.join(__dirname, '..', 'cards'), path.join(__dirname, '..', 'pages')];
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const offenders = roots.flatMap(walk).filter(f => f.endsWith('.module.css')).flatMap(f => {
    const css = fs.readFileSync(f, 'utf8');
    const outer = [
      ...Array.from(css.matchAll(/outline-offset:\s*[1-9]/g)),                       // ring pushed outside
      ...Array.from(css.matchAll(/\{[^}]*outline:\s*\d+px solid[^}]*\}/g)).filter(m => !/outline-offset:\s*-/.test(m[0])),
      ...Array.from(css.matchAll(/box-shadow:\s*0 0 0 \d/g)),                         // spread ring outside
    ];
    return outer.map(m => `${path.basename(f)}: ${m[0].slice(0, 60)}`);
  });
  expect(offenders).toEqual([]);
});
