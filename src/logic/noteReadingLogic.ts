// ---------------------------------------------------------------------------
// Pure logic for the Note Reading card — prompt generation, validation, and
// label/MIDI math. No React, no store, no side effects. All fully unit-tested.
// ---------------------------------------------------------------------------

export type Label =
  | 'C'  | 'D'  | 'E'  | 'F'  | 'G'  | 'A'  | 'B'
  | 'C#' | 'D#' | 'E#' | 'F#' | 'G#' | 'A#' | 'B#'
  | 'Cb' | 'Db' | 'Eb' | 'Fb' | 'Gb' | 'Ab' | 'Bb';

/** The 21 labels rendered by the answer button grid. Order matches spec §4.1:
 *  row 1 sharps, row 2 naturals, row 3 flats. */
export const ALL_LABELS: Label[] = [
  'C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#',
  'C',  'D',  'E',  'F',  'G',  'A',  'B',
  'Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb',
];

const LABEL_PC: Record<Label, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
  'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10, B: 11, 'B#': 0, Cb: 11,
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

// ---- Spelling selection for staff prompts ----

const NATURAL_PCS = new Set([0, 4, 5, 11]); // C, E, F, B
const NATURAL_LETTERS = new Set<Label>(['C', 'E', 'F', 'B']);

/** Pick a Label spelling for a MIDI pitch, using the spec §7.1 weighting:
 *  - Pitch classes with only one valid Label always use it (D, D#, etc.).
 *  - Black-key pitch classes with two spellings: 50/50 sharp vs flat.
 *  - Natural-natural pitch classes (0,4,5,11) pick the enharmonic 10% of the
 *    time (B#/Cb/E#/Fb) to keep the full 21-button grid exercised. */
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
  const midi = clef === 'treble' ? randInt(60, 84) : randInt(40, 60);
  const spelling = pickSpellingForMidi(midi);
  return { kind: 'staff', midi, clef, spelling };
};

export const pickFretboardPrompt = (
  tuning: string[],
  fretCount: number = 12,
): FretboardPrompt => {
  const stringIndex = randInt(0, 5);
  const fret = randInt(0, fretCount);
  const midi = midiFromTuningAndFret(tuning, stringIndex, fret);
  const acceptableAnswers = pitchClassToLabels(((midi % 12) + 12) % 12);
  return { kind: 'fretboard', midi, stringIndex, fret, acceptableAnswers };
};

// ---- Validation ----

export const validateAnswer = (prompt: Prompt, label: Label): 'correct' | 'wrong' => {
  if (prompt.kind === 'staff' || prompt.kind === 'phrase') {
    return label === prompt.spelling ? 'correct' : 'wrong';
  }
  return prompt.acceptableAnswers.includes(label) ? 'correct' : 'wrong';
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
