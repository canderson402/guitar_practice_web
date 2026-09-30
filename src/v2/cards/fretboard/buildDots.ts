import { generateFretboard } from '../../../data/guitarData';
import { DotInfo, posKey } from '../../../components/Fretboard/types';
import { chromaticPosition } from '../../music/intervals';

export type DotLabels = 'notes' | 'intervals' | 'none';

export interface DotInput {
  tuning: string[];
  frets: number;
  root: string | null;
  scaleNotes: string[];
  /** The note the Scale card is currently on (not a new root). */
  selected?: string | null;
  show: { root: boolean; scale: boolean; selected?: boolean };
  labels: DotLabels;
  /** Label for a note in interval mode (scale-aware degree). */
  degreeOf(note: string): string;
  /** Chord focus: only these chord tones are drawn (root = chordRoot). */
  chord?: { root: string; pitches: number[] } | null;
}

// Colors come from v2 music tokens so dots follow light/dark themes.
const COLOR = { root: 'var(--note-root)', scale: 'var(--note-scale)', current: 'var(--note-chord)' };

/** Which dot (if any) sits on every string/fret. Priority: selected note > root > scale tone. */
export const buildDots = (i: DotInput): Map<string, DotInfo> => {
  const map = new Map<string, DotInfo>();
  const board = generateFretboard(i.tuning, i.frets);
  const inScale = new Set(i.scaleNotes.map(chromaticPosition));
  const same = (a: string | null | undefined, b: string) => !!a && chromaticPosition(a) === chromaticPosition(b);

  board.forEach((string, si) => string.forEach(cell => {
    if (!cell || cell.fret > i.frets) return;
    const note = cell.note;
    const label = i.labels === 'none' ? '' : i.labels === 'intervals' ? i.degreeOf(note) : note;
    let variant: 'root' | 'scale' | 'current' | null = null;
    if (i.chord) {
      if (!i.chord.pitches.includes(chromaticPosition(note))) return;
      variant = same(i.chord.root, note) ? (i.show.root ? 'root' : null) : (i.show.scale ? 'scale' : null);
    } else if (i.show.selected && same(i.selected, note)) variant = 'current';
    else if (i.show.root && same(i.root, note)) variant = 'root';
    else if (i.show.scale && inScale.has(chromaticPosition(note))) variant = 'scale';
    if (variant) map.set(posKey(si, cell.fret), { variant, label, color: COLOR[variant] });
  }));
  return map;
};
