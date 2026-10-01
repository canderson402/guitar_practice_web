import { chordTypes, chordIntervalSpellings, getChordChromaticPositions, getChromaticPosition } from '../../../data/musicData';
import { degreeLabel } from '../../../data/chordBuilder';
import { intervalSymbol } from '../../music/intervals';
import type { SelectedChord } from '../../../store/useStore';

/** Pitch classes of a selected chord: a built chord brings its own intervals
 *  (any chord, 9/11/13 folded into one octave); an in-key chord uses its type. */
export const chordPitches = (c: SelectedChord): number[] => (c.intervals
  ? c.intervals.map(i => (getChromaticPosition(c.note) + i) % 12)
  : getChordChromaticPositions(c.note, c.type as keyof typeof chordTypes));

/** A fret doesn't say which octave a note is in, so a single label is the
 *  simple interval: 9 → 2, ♭9 → ♭2, ♯9 → ♯2, 11 → 4, ♯11 → ♯4, 13 → 6. */
const simple = (label: string): string => label.replace(/\d+/, d => String(Number(d) > 7 ? Number(d) - 7 : Number(d)));

/** Interval labels while a chord shows, measured from the chord's root (not
 *  the key): its tones get the chord's own degree names, folded into one
 *  octave (F maj9 → 1 3 5 7 2; 𝄫7, ♯4…); any other note gets its plain
 *  interval from the chord's root. */
export const chordDegreeOf = (c: SelectedChord): ((note: string) => string) => {
  const root = getChromaticPosition(c.note);
  const tones = new Map<number, string>();
  if (c.intervals) c.intervals.forEach(i => tones.set((root + i) % 12, simple(degreeLabel(i, c.intervals!))));
  else {
    const type = c.type as keyof typeof chordTypes;
    (chordTypes[type]?.intervals ?? []).forEach((i, k) => tones.set((root + i) % 12, chordIntervalSpellings[type][k]));
  }
  return note => tones.get(getChromaticPosition(note)) ?? intervalSymbol(c.note, note);
};

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Spell a chord tone from the root by its degree: the letter is the root's
 *  letter plus the degree (3rd → 2 letters up, ♭7 → 6, ♯9 → 1…), the
 *  accidental makes up the difference (so ♭7 of C is B♭, 𝄫7 is B𝄫 = Bbb). */
const spell = (root: string, degree: string, pc: number): string => {
  const n = parseInt(degree.replace(/[^0-9]/g, ''), 10);
  const letter = LETTERS[(LETTERS.indexOf(root[0]) + n - 1) % 7];
  const diff = ((pc - LETTER_PC[letter] + 18) % 12) - 6;
  return letter + (diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff));
};

/** Note names while a chord shows: its tones spelled from its root (E♭maj9 =
 *  E♭ G B♭ D F); other notes keep their name. */
export const chordNameOf = (c: SelectedChord): ((note: string) => string) => {
  const degreeOf = chordDegreeOf(c);
  const pcs = new Set(chordPitches(c));
  return note => {
    const pc = getChromaticPosition(note);
    return pcs.has(pc) ? spell(c.note, degreeOf(note), pc) : note;
  };
};

/** Note names without a chord: notes in the key use the key's spelling. */
export const scaleNameOf = (scaleNotes: string[]): ((note: string) => string) => {
  const names = new Map(scaleNotes.map(n => [getChromaticPosition(n), n]));
  return note => names.get(getChromaticPosition(note)) ?? note;
};
