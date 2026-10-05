import type { Workspace } from './useV2Store';

/** Every card, laid out: small cards in rows of three, then the full-width
 *  cards ("Add all cards" on an empty workspace). */
export const ALL_CARDS_ROWS: string[][] = [
  ['metronome', 'timer', 'scale'],
  ['circle-of-fifths', 'note-trainer', 'chord'],
  ['fretboard'],
  ['harmony'],
  ['jam'],
];

/** A fresh install starts with a single, focused workspace: metronome, scale
 *  and chords on one row, the fretboard below. Other cards are one "Add card"
 *  away. */
export const DEFAULT_WORKSPACE: Workspace = {
  id: 'practice',
  name: 'Practice',
  rows: [['metronome', 'scale', 'chord'], ['fretboard']],
};
