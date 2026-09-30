/* eslint-disable testing-library/no-container, testing-library/no-node-access -- VexFlow's SVG has no role to query by */
import React from 'react';
import { render } from '@testing-library/react';
import { MelodyStaff } from './MelodyStaff';
import { generatePhrase } from '../../data/generatePhrase';

const melody = generatePhrase({ bars: 2, key: 'C', notesPerBar: 4, clefTarget: 'treble' } as Parameters<typeof generatePhrase>[0]);

it('has a viewBox matching its size, so CSS can scale it to fit (v2 sight reading relies on this)', () => {
  const svg = render(<MelodyStaff measures={melody.measures} timeSignature={melody.timeSignature} currentNoteIndex={0} />)
    .container.querySelector('svg')!;
  expect(svg.getAttribute('viewBox')).toBe(`0 0 ${svg.getAttribute('width')} ${svg.getAttribute('height')}`);
});

it('can draw larger or smaller (opt-in scale) without changing its layout', () => {
  const plain = render(<MelodyStaff measures={melody.measures} timeSignature={melody.timeSignature} currentNoteIndex={0} />)
    .container.querySelector('svg')!;
  const w = Number(plain.getAttribute('width'));
  const h = Number(plain.getAttribute('height'));
  const scaled = render(<MelodyStaff measures={melody.measures} timeSignature={melody.timeSignature} currentNoteIndex={0} scale={1.5} />)
    .container.querySelector('svg')!;
  expect(Number(scaled.getAttribute('width'))).toBe(w * 1.5);
  expect(Number(scaled.getAttribute('height'))).toBe(h * 1.5);
  expect(scaled.getAttribute('viewBox')).toBe(`0 0 ${w} ${h}`);
});
