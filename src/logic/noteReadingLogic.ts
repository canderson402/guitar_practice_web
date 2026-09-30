// ---------------------------------------------------------------------------
// Pure logic for the Note Reading card — prompt generation, validation, and
// label/MIDI math. No React, no store, no side effects. All fully unit-tested.
// ---------------------------------------------------------------------------

export type Label =
  | 'C'  | 'D'  | 'E'  | 'F'  | 'G'  | 'A'  | 'B'
  | 'C#' | 'D#' | 'E#' | 'F#' | 'G#' | 'A#'
  | 'Db' | 'Eb' | 'Fb' | 'Gb' | 'Ab' | 'Bb';

/** The 19 labels rendered by the answer button grid. Order matches spec §4.1:
 *  row 1 sharps, row 2 naturals, row 3 flats. */
export const ALL_LABELS: Label[] = [
  'C#', 'D#', 'E#', 'F#', 'G#', 'A#',
  'C',  'D',  'E',  'F',  'G',  'A',  'B',
  'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb',
];

const LABEL_PC: Record<Label, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
  'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10, B: 11,
};

export const labelToPitchClass = (l: Label): number => LABEL_PC[l];

export const pitchClassToLabels = (pc: number): Label[] => {
  const target = ((pc % 12) + 12) % 12;
  return ALL_LABELS.filter(l => LABEL_PC[l] === target);
};

// ---- Prompt shapes ----

export interface StaffPrompt {
  kind: 'staff';
  midi: number;
  clef: 'treble' | 'bass';
  spelling: Label;
}

export interface FretboardPrompt {
  kind: 'fretboard';
  midi: number;
  stringIndex: number;
  fret: number;
  acceptableAnswers: Label[];
}

export interface PhrasePrompt {
  kind: 'phrase';
  melody: import('../data/famousMelodies').Melody;
  noteIndex: number;
  midi: number;
  spelling: Label;
}

export type Prompt = StaffPrompt | FretboardPrompt | PhrasePrompt;

// ---- Helpers ----

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const noteNameToPitchClass = (name: string): number => {
  const letter = name[0].toUpperCase();
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pc = base[letter];
  if (name.includes('#')) pc = (pc + 1) % 12;
  if (name.includes('b')) pc = (pc + 11) % 12;
  return pc;
};

/** Standard 6-string-guitar octaves for each string position in display order
 *  (high-E first). Assumes a guitar's conventional pitch range. */
const STANDARD_OCTAVES_HIGH_TO_LOW = [4, 3, 3, 3, 2, 2];

/** Compute the MIDI pitch at a given string/fret combination for a tuning
 *  array ordered high-E first (matching the store's `note.tuning` layout). */
export const midiFromTuningAndFret = (
  tuning: string[],
  stringIndex: number,
  fret: number,
): number => {
  const name = tuning[stringIndex];
  const pc = noteNameToPitchClass(name);
  const octave = STANDARD_OCTAVES_HIGH_TO_LOW[stringIndex];
  return 12 * (octave + 1) + pc + fret;
};

/** Spelled note name with octave, e.g. 'Db4'. Every remaining label (no
 *  B#/Cb) shares its octave number with the MIDI pitch. */
export const noteNameWithOctave = (label: Label, midi: number): string =>
  `${label}${Math.floor(midi / 12) - 1}`;

// ---- Tested range ----

/** Every prompt in every mode lands in A1..G6, which is exactly what the
 *  answer piano shows. */
export const MIDDLE_C = 60;
export const RANGE_MIN = 33; // A1
export const RANGE_MAX = 91; // G6

/** Move a pitch by whole octaves until it sits inside A1..G6. */
export const foldIntoRange = (midi: number): number => {
  let m = midi;
  while (m < RANGE_MIN) m += 12;
  while (m > RANGE_MAX) m -= 12;
  return m;
};

// ---- Spelling selection for staff prompts ----

const NATURAL_PCS = new Set([4, 5]); // E, F
const NATURAL_LETTERS = new Set<Label>(['E', 'F']);

/** Pick a Label spelling for a MIDI pitch, using the spec §7.1 weighting:
 *  - Pitch classes with only one valid Label always use it (D, D#, etc.).
 *  - Black-key pitch classes with two spellings: 50/50 sharp vs flat.
 *  - E and F pick the enharmonic 10% of the time (Fb/E#) to keep the answer
 *    grid exercised. */
const pickSpellingForMidi = (midi: number): Label => {
  const pc = ((midi % 12) + 12) % 12;
  const options = pitchClassToLabels(pc);
  if (options.length === 1) return options[0];
  if (NATURAL_PCS.has(pc)) {
    const natural = options.find(l => NATURAL_LETTERS.has(l))!;
    const enharmonic = options.find(l => !NATURAL_LETTERS.has(l))!;
    return Math.random() < 0.1 ? enharmonic : natural;
  }
  return options[Math.random() < 0.5 ? 0 : 1];
};

// ---- Prompt generators ----

export const pickStaffPrompt = (
  clefs: { treble: boolean; bass: boolean } = { treble: true, bass: true },
): StaffPrompt => {
  const both = clefs.treble && clefs.bass;
  const clef: 'treble' | 'bass' = both
    ? (Math.random() < 0.5 ? 'treble' : 'bass')
    : (clefs.treble ? 'treble' : 'bass');
  const midi = clef === 'treble' ? randInt(MIDDLE_C, RANGE_MAX) : randInt(RANGE_MIN, MIDDLE_C);
  const spelling = pickSpellingForMidi(midi);
  return { kind: 'staff', midi, clef, spelling };
};

export const pickFretboardPrompt = (
  tuning: string[],
  fretCount: number = 12,
): FretboardPrompt => {
  // Only positions whose pitch falls in the tested range.
  const positions: Array<{ stringIndex: number; fret: number; midi: number }> = [];
  tuning.forEach((_, si) => {
    for (let f = 0; f <= fretCount; f++) {
      const m = midiFromTuningAndFret(tuning, si, f);
      if (m >= RANGE_MIN && m <= RANGE_MAX) positions.push({ stringIndex: si, fret: f, midi: m });
    }
  });
  const { stringIndex, fret, midi } = positions[randInt(0, positions.length - 1)];
  const acceptableAnswers = pitchClassToLabels(((midi % 12) + 12) % 12);
  return { kind: 'fretboard', midi, stringIndex, fret, acceptableAnswers };
};

// ---- Validation ----

/** A piano key (MIDI number) or a note-name button (Label). */
export type Answer = number | Label;

/** Piano keys must match exactly — right octave included; any spelling works
 *  (the C#/Db key answers both). Note-name buttons (fretboard mode) match on
 *  pitch class, so either enharmonic counts. */
export const validateAnswer = (prompt: Prompt, answer: Answer): 'correct' | 'wrong' => {
  if (typeof answer === 'number') return answer === prompt.midi ? 'correct' : 'wrong';
  const pc = ((prompt.midi % 12) + 12) % 12;
  return labelToPitchClass(answer) === pc ? 'correct' : 'wrong';
};


// ---- No-immediate-repeat guard ----

const sameIdentity = (a: Prompt, b: Prompt): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'staff' && b.kind === 'staff') {
    return a.spelling === b.spelling && a.clef === b.clef;
  }
  if (a.kind === 'fretboard' && b.kind === 'fretboard') {
    return a.stringIndex === b.stringIndex && a.fret === b.fret;
  }
  if (a.kind === 'phrase' && b.kind === 'phrase') {
    return a.melody.id === b.melody.id && a.noteIndex === b.noteIndex;
  }
  return false;
};

/** Generate the next prompt, regenerating up to 3 times if it matches the
 *  previous one. The cap guarantees termination (the small answer space on
 *  fretboard mode makes occasional repeats unavoidable). */
export const nextPromptAvoidingRepeat = (
  previous: Prompt | null,
  mode: 'staff' | 'fretboard',
  tuning: string[],
  fretCount: number = 12,
  clefs: { treble: boolean; bass: boolean } = { treble: true, bass: true },
): Prompt => {
  const make = (): Prompt =>
    mode === 'staff' ? pickStaffPrompt(clefs) : pickFretboardPrompt(tuning, fretCount);
  let next = make();
  let attempts = 0;
  while (previous && sameIdentity(next, previous) && attempts < 3) {
    next = make();
    attempts += 1;
  }
  return next;
};
