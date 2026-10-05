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
  /** How to spell a note's name for the context (key or chord); default as is. */
  nameOf?(note: string): string;
  /** Chord focus: only these chord tones are drawn (root = chordRoot). */
  chord?: { root: string; pitches: number[] } | null;
}

// Colors come from v2 music tokens so dots follow light/dark themes.
const COLOR = { root: 'var(--note-root)', scale: 'var(--note-scale)', current: 'var(--note-chord)' };

export type DotStyle = Omit<DotInput, 'tuning' | 'frets'>;

/** The dot for one note (any octave), or null. Priority: root > selected
 *  note > scale tone (a selected note that is the root keeps the root
 *  color). With a chord showing, only its tones are drawn (its root as the
 *  root) — plus the selected note, which always shows. Shared by the
 *  fretboard and the piano. */
export const dotForNote = (i: DotStyle, note: string): DotInfo | null => {
  const inScale = i.scaleNotes.some(n => chromaticPosition(n) === chromaticPosition(note));
  const same = (a: string | null | undefined, b: string) => !!a && chromaticPosition(a) === chromaticPosition(b);
  const label = i.labels === 'none' ? '' : i.labels === 'intervals' ? i.degreeOf(note) : (i.nameOf?.(note) ?? note);
  let variant: 'root' | 'scale' | 'current' | null = null;
  if (i.chord) {
    const inChord = i.chord.pitches.includes(chromaticPosition(note));
    if (inChord && i.show.root && same(i.chord.root, note)) variant = 'root';
    else if (i.show.selected && same(i.selected, note)) variant = 'current';
    else if (inChord && i.show.scale && !same(i.chord.root, note)) variant = 'scale';
  } else if (i.show.root && same(i.root, note)) variant = 'root';
  else if (i.show.selected && same(i.selected, note)) variant = 'current';
  else if (i.show.scale && inScale) variant = 'scale';
  return variant ? { variant, label, color: COLOR[variant] } : null;
};

/** Which dot (if any) sits on every string/fret (see `dotForNote`). */
export const buildDots = (i: DotInput): Map<string, DotInfo> => {
  const map = new Map<string, DotInfo>();
  generateFretboard(i.tuning, i.frets).forEach((string, si) => string.forEach(cell => {
    if (!cell || cell.fret > i.frets) return;
    const dot = dotForNote(i, cell.note);
    if (dot) map.set(posKey(si, cell.fret), dot);
  }));
  return map;
};
