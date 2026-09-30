import type { Article } from '../types';

// Placeholder: headings exist so Learn links land on the right section.
export const circleOfFifths: Article = {
  slug: 'circle-of-fifths',
  chapter: 'Foundations',
  title: 'The circle of fifths',
  summary: 'How the 12 keys connect, and how to use the circle to practice in all of them.',
  minutes: 6,
  draft: true,
  blocks: [
    ...['What the circle of fifths is', 'Practicing in all 12 keys', 'Fifths vs. fourths', 'Relative keys'].flatMap(name => [
      { type: 'heading' as const, text: name },
      { type: 'paragraph' as const, text: 'Full explanation coming soon.' },
    ]),
  ],
};
