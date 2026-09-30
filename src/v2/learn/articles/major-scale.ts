import type { Article } from '../types';

export const majorScale: Article = {
  slug: 'major-scale',
  chapter: 'Foundations',
  title: 'The major scale',
  summary: 'The seven-note pattern almost everything else is built from.',
  minutes: 4,
  blocks: [
    { type: 'paragraph', text: 'Nearly every scale, chord and key you will meet is described relative to the major scale. Learn its shape once and the rest of theory gets a lot less mysterious.' },
    { type: 'heading', text: 'Whole steps and half steps' },
    { type: 'paragraph', text: 'On guitar, one fret is a half step and two frets are a whole step. The major scale is the pattern whole, whole, half, whole, whole, whole, half.' },
    { type: 'example', kind: 'scale', root: 'C', scale: 'Major (Ionian)', caption: 'C major: no sharps or flats.' },
    { type: 'callout', tone: 'tip', text: 'Sing "do re mi fa sol la ti do" while you play it. You already know how the major scale sounds.' },
    { type: 'heading', text: 'Same pattern, any key' },
    { type: 'paragraph', text: 'Start the same pattern on G and you get G major, which needs one sharp (F♯) to keep the steps right.' },
    { type: 'example', kind: 'scale', root: 'G', scale: 'Major (Ionian)', caption: 'G major: one sharp.' },
    { type: 'tryIt', label: 'Try it in Practice', set: { key: 'G', scale: 'Major (Ionian)', bpm: 80 }, workspaceId: 'warm-up' },
  ],
};
