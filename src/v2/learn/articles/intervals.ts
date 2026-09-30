import type { Article } from '../types';

const INTERVALS = [
  'Root', 'Minor second', 'Major second', 'Minor third', 'Major third', 'Perfect fourth',
  'Tritone', 'Perfect fifth', 'Minor sixth', 'Major sixth', 'Minor seventh', 'Major seventh',
];

// Placeholder: headings exist so Learn links land on the right section.
export const intervals: Article = {
  slug: 'intervals',
  chapter: 'Foundations',
  title: 'Intervals',
  summary: 'The distance between two notes, and why each one sounds the way it does.',
  minutes: 6,
  draft: true,
  blocks: [
    { type: 'paragraph', text: 'An interval is the distance between two notes, counted in half steps (frets).' },
    ...INTERVALS.flatMap(name => [
      { type: 'heading' as const, text: name },
      { type: 'paragraph' as const, text: 'Full explanation coming soon.' },
    ]),
  ],
};
