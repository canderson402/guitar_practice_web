import { TUNING_PRESETS } from './tunings';

// Same behavior as v1's TuningPicker: semitone nudges per string or all at
// once, spelled with flats going down and sharps going up so labels stay
// musically natural through repeated nudges.
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export const stepNote = (note: string, delta: 1 | -1): string => {
  const pos = CHROMATIC[note];
  if (pos === undefined) return note;
  return (delta < 0 ? FLAT_SCALE : SHARP_SCALE)[(pos + delta + 12) % 12];
};

export const shiftAll = (tuning: string[], delta: 1 | -1): string[] => tuning.map(n => stepNote(n, delta));

/** The preset this tuning matches by pitch (Eb ≡ D#), if any. */
export const matchPreset = (tuning: string[]) =>
  TUNING_PRESETS.find(p => p.tuning.length === tuning.length && p.tuning.every((n, i) => CHROMATIC[n] === CHROMATIC[tuning[i]]));
