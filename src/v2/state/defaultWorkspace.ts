import type { Workspace } from './useV2Store';

/** Every card, laid out: small cards in rows of three, then the full-width cards. */
export const ALL_CARDS_ROWS: string[][] = [
  ['metronome', 'timer', 'scale'],
  ['circle-of-fifths', 'note-trainer', 'chord'],
  ['fretboard'],
  ['harmony'],
  ['jam'],
];

/** A fresh install starts with a single workspace holding every card. */
export const DEFAULT_WORKSPACE: Workspace = { id: 'practice', name: 'Practice', rows: ALL_CARDS_ROWS };
