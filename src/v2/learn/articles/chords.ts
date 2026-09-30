import type { Article } from '../types';

// Placeholder: headings exist so Learn links land on the right section.
export const chords: Article = {
  slug: 'chords-and-triads',
  chapter: 'Foundations',
  title: 'Chords and triads',
  summary: 'How three notes make a chord, and which chords belong to a key.',
  minutes: 6,
  draft: true,
  blocks: [
    ...['Triads', 'Chords in a key'].flatMap(name => [
      { type: 'heading' as const, text: name },
      { type: 'paragraph' as const, text: 'Full explanation coming soon.' },
    ]),
  ],
};
