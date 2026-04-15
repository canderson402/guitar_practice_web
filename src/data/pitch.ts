import { getChromaticPosition } from './musicData';

// ---------------------------------------------------------------------------
// Pitch helpers — translate between (stringIndex, fret, tuning) and a
// MIDI-numbered pitch with octave. Used by the PianoKeyboard primitive to
// render fretboard-based dot data onto piano keys.
//
// MIDI convention used throughout:
//   C-1 = 0, C0 = 12, C4 (middle C) = 60, A4 = 69.
// ---------------------------------------------------------------------------

/** Standard open-string MIDI numbers in display order (high E → low E).
 *  These define the "default octave" for each string position — if the user
 *  retunes a string, we pick the octave whose MIDI pitch is closest to this
 *  anchor, so e.g. dropping the low E to D yields D2 (not D1 or D3). */
const STANDARD_OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // E4, B3, G3, D3, A2, E2

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface Pitch {
  midi: number;
  /** Scientific octave (C4 = middle C octave 4). */
  octave: number;
  /** Sharp spelling of the note letter (e.g. 'F#'). */
  name: string;
}

/** Compute the MIDI number + octave of a string's open pitch, given the
 *  user's tuning choice. Picks the octave whose resulting MIDI is closest
 *  to the standard open-string pitch — so retunings stay in the same
 *  register by default. */
export const openPitchForString = (tuning: string[], stringIdx: number): Pitch => {
  const pitchClass = getChromaticPosition(tuning[stringIdx] ?? 'E');
  const anchor = STANDARD_OPEN_MIDI[stringIdx] ?? 40;
  // Scan candidate octaves and pick the nearest to the anchor.
  let best = { octave: 2, midi: anchor, dist: Infinity };
  for (let oct = 0; oct <= 8; oct++) {
    const midi = 12 + oct * 12 + pitchClass;
    const dist = Math.abs(midi - anchor);
    if (dist < best.dist) best = { octave: oct, midi, dist };
  }
  return { midi: best.midi, octave: best.octave, name: SHARP_NAMES[pitchClass] };
};

/** MIDI pitch of a given (stringIndex, fret) under the current tuning. */
export const cellToMidi = (tuning: string[], stringIdx: number, fret: number): number => {
  return openPitchForString(tuning, stringIdx).midi + fret;
};

/** Convert a MIDI number to a Pitch with sharp spelling. */
export const midiToPitch = (midi: number): Pitch => ({
  midi,
  octave: Math.floor((midi - 12) / 12),
  name: SHARP_NAMES[(midi - 12 + 120) % 12],
});

/** Find the first (stringIndex, fret) position producing a given MIDI pitch,
 *  prioritising the LOWEST fret (= simplest fingering). When multiple strings
 *  can play the same pitch at the same low fret, picks the highest string.
 *  Returns null if the pitch isn't reachable on the current fretboard. */
export const findLowestFretForPitch = (
  tuning: string[],
  midi: number,
  fretCount: number,
  stringCount: number = 6
): { stringIndex: number; fret: number } | null => {
  let best: { stringIndex: number; fret: number } | null = null;
  for (let si = 0; si < stringCount; si++) {
    const openMidi = openPitchForString(tuning, si).midi;
    const fret = midi - openMidi;
    if (fret < 0 || fret > fretCount) continue;
    if (!best || fret < best.fret) {
      best = { stringIndex: si, fret };
    }
  }
  return best;
};

/** Collect the full set of distinct MIDI pitches producible by the current
 *  fretboard (every stringIndex × fret cell). Used to derive the piano's
 *  visible range. Returns a sorted ascending array. */
export const fretboardPitchRange = (
  tuning: string[],
  fretCount: number,
  stringCount: number = 6
): number[] => {
  const set = new Set<number>();
  for (let si = 0; si < stringCount; si++) {
    const open = openPitchForString(tuning, si).midi;
    for (let f = 0; f <= fretCount; f++) set.add(open + f);
  }
  return Array.from(set).sort((a, b) => a - b);
};

/** Expand the pitch range to whole octaves (C through B) so the piano
 *  always starts on C and ends on B. Given min/max MIDI, returns the
 *  wider MIDI bounds that cover whole octaves. */
export const octaveAlignedRange = (minMidi: number, maxMidi: number): { min: number; max: number } => {
  // Align down to C of that octave, align up to B of that octave.
  const minOctave = Math.floor((minMidi - 12) / 12);
  const maxOctave = Math.floor((maxMidi - 12) / 12);
  return {
    min: 12 + minOctave * 12,       // C<minOctave>
    max: 12 + maxOctave * 12 + 11,  // B<maxOctave>
  };
};

/** Returns true for semitones that correspond to black keys on a piano. */
export const isBlackKey = (midi: number): boolean => {
  const pc = (midi - 12 + 120) % 12;
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
};
