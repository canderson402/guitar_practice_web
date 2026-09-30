import type { Article } from '../types';

const SECTIONS = [
  'Major (Ionian)', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian (natural minor)', 'Locrian',
  'Harmonic minor', 'Major pentatonic', 'Minor pentatonic', 'Chromatic scale',
];

// Placeholder: headings exist so Learn links land on the right section.
export const scalesAndModes: Article = {
  slug: 'scales-and-modes',
  chapter: 'Foundations',
  title: 'Scales and modes',
  summary: 'Same notes, different home: how modes and pentatonics relate to the major scale.',
  minutes: 8,
  draft: true,
  blocks: [
    { type: 'paragraph', text: 'Every mode is the major scale started from a different degree.' },
    ...SECTIONS.flatMap(name => [
      { type: 'heading' as const, text: name },
      { type: 'paragraph' as const, text: 'Full explanation coming soon.' },
    ]),
  ],
};
