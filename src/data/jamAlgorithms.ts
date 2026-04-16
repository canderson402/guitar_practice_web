/**
 * jamAlgorithms.ts — Pure music-math module for the Jam feature.
 *
 * No React, no store, no audio dependencies.
 * All functions are pure (or at worst, reference only the constants in this file
 * and the imported helpers from musicData.ts).
 */

import {
  getChromaticPosition,
  getScaleChords,
  getScaleNotes,
  chordTypes,
  scales,
} from './musicData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JamAlgorithm =
  | 'fifths'
  | 'fourths'
  | 'skip1'
  | 'skip2'
  | 'diatonic-fifths'
  | 'diatonic-fourths'
  | 'diatonic-thirds'
  | 'ii-v'
  | 'random';

export interface JamChord {
  note: string;
  type: string;
  symbol: string;
  roman: string;
  midi: number[];
}

export type DrumPatternName = 'rock' | 'bossa' | 'hiphop';
export type DrumInstrument = 'kick' | 'snare' | 'hat';

export interface DrumHit {
  instrument: DrumInstrument;
  position: number;
  gain: number;
}

export interface WalkState {
  iiVState?: {
    /** 0 = about to play ii, 1 = about to play V, 2 = about to play I */
    position: number;
    targetDegree: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CIRCLE_OF_FIFTHS: string[] = [
  'C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F',
];

export const FOURTHS_FROM_C: string[] = [
  'C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G',
];

// ---------------------------------------------------------------------------
// MIDI derivation
// ---------------------------------------------------------------------------

/**
 * Return MIDI notes for a chord. Root is placed in octave 3 (C3 = 48).
 */
export const chordToMidi = (note: string, type: string): number[] => {
  const rootPos = getChromaticPosition(note);
  // C3 = MIDI 48 (using C3 = 48 convention: C0=12, C1=24, C2=36, C3=48)
  const rootMidi = 48 + rootPos;
  const chordDef = chordTypes[type as keyof typeof chordTypes];
  if (!chordDef) return [rootMidi];
  return chordDef.intervals.map(interval => rootMidi + interval);
};

// ---------------------------------------------------------------------------
// Chord quality — parallel mode borrowing
// ---------------------------------------------------------------------------

/**
 * Return `{ type, symbol }` for `note` given a root and scale context.
 * Lookup order:
 *   1. Selected scale's diatonic chords
 *   2. Aeolian (Natural Minor) diatonic chords
 *   3. Harmonic Minor diatonic chords
 *   4. Fallback: major triad
 */
export const getChordQuality = (
  note: string,
  rootNote: string,
  scaleType: keyof typeof scales
): { type: string; symbol: string } => {
  const notePos = getChromaticPosition(note);

  // Helper: find matching chord quality in a set of scale chords
  const findInScale = (
    root: string,
    scale: keyof typeof scales
  ): { type: string; symbol: string } | null => {
    const chords = getScaleChords(root, scale);
    const match = chords.find(c => getChromaticPosition(c.note) === notePos);
    if (match) return { type: match.type, symbol: match.symbol };
    return null;
  };

  return (
    findInScale(rootNote, scaleType) ??
    findInScale(rootNote, 'Aeolian (Natural Minor)') ??
    findInScale(rootNote, 'Harmonic Minor') ??
    { type: 'major', symbol: chordTypes.major.symbol }
  );
};

// ---------------------------------------------------------------------------
// Roman numeral labelling
// ---------------------------------------------------------------------------

const DEGREE_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * Produce the roman numeral label for a chord, e.g. "ii", "bVII", "iv°".
 * Diatonic notes get their scale-degree numeral; chromatic notes get a flat prefix.
 */
export const romanLabel = (
  note: string,
  type: string,
  rootNote: string,
  scaleType: keyof typeof scales
): string => {
  const notePos = getChromaticPosition(note);
  const scaleNotes = getScaleNotes(rootNote, scaleType);

  // Check if note is diatonic
  const diatonicIdx = scaleNotes.findIndex(
    n => getChromaticPosition(n) === notePos
  );

  let numeral: string;

  if (diatonicIdx !== -1) {
    numeral = DEGREE_NAMES[diatonicIdx] ?? `${diatonicIdx + 1}`;
  } else {
    // Chromatic — find the scale degree just above this pitch and flat it
    const rootPos = getChromaticPosition(rootNote);

    // Compute semitone distance from root for each scale degree
    const scalePositions = scaleNotes.map(n => (getChromaticPosition(n) - rootPos + 12) % 12);
    const noteInterval = (notePos - rootPos + 12) % 12;

    // Find the nearest scale degree above this interval (ascending)
    let closestDegree = 0;
    let smallestGap = 13;
    for (let i = 0; i < scalePositions.length; i++) {
      const gap = (scalePositions[i] - noteInterval + 12) % 12;
      if (gap > 0 && gap < smallestGap) {
        smallestGap = gap;
        closestDegree = i;
      }
    }
    numeral = 'b' + (DEGREE_NAMES[closestDegree] ?? `${closestDegree + 1}`);
  }

  // Case and suffix based on type
  const isDim = type === 'diminished' || type === 'diminished7';
  const isMinor =
    type === 'minor' ||
    type === 'minor7' ||
    type === 'half-diminished7';

  if (isDim) {
    return numeral.replace(/([A-Z]+)/, m => m.toLowerCase()) + '°';
  }
  if (isMinor) {
    return numeral.replace(/([A-Z]+)/, m => m.toLowerCase());
  }
  return numeral.replace(/([a-z]+)/, m => m.toUpperCase());
}

// ---------------------------------------------------------------------------
// Unified chord builder
// ---------------------------------------------------------------------------

/**
 * Build a full JamChord for `note` in the given key/scale context.
 */
export const buildJamChord = (
  note: string,
  rootNote: string,
  scaleType: keyof typeof scales
): JamChord => {
  const { type, symbol } = getChordQuality(note, rootNote, scaleType);
  const roman = romanLabel(note, type, rootNote, scaleType);
  const midi = chordToMidi(note, type);
  return { note, type, symbol, roman, midi };
};

// ---------------------------------------------------------------------------
// Chromatic walk algorithms
// ---------------------------------------------------------------------------

/**
 * Step through `circle` by `skip` positions from the entry matching `currentNote`.
 * Falls back gracefully if `currentNote` is not in the circle.
 */
export const chromaticWalk = (
  circle: string[],
  currentNote: string,
  skip: number
): string => {
  const currentPos = getChromaticPosition(currentNote);
  let idx = circle.findIndex(n => getChromaticPosition(n) === currentPos);
  if (idx === -1) idx = 0;
  return circle[(idx + skip + circle.length) % circle.length];
};

/**
 * Dispatch chromatic algorithm → next note.
 */
export const nextChordChromatic = (
  algorithm: 'fifths' | 'fourths' | 'skip1' | 'skip2',
  currentNote: string
): string => {
  switch (algorithm) {
    case 'fifths':
      return chromaticWalk(CIRCLE_OF_FIFTHS, currentNote, 1);
    case 'fourths':
      return chromaticWalk(FOURTHS_FROM_C, currentNote, 1);
    case 'skip1':
      return chromaticWalk(CIRCLE_OF_FIFTHS, currentNote, 2);
    case 'skip2':
      return chromaticWalk(CIRCLE_OF_FIFTHS, currentNote, 3);
  }
};

// ---------------------------------------------------------------------------
// Diatonic walk algorithms
// ---------------------------------------------------------------------------

/**
 * Next note result for diatonic walks; may carry updated ii-V state.
 */
export interface DiatonicWalkResult {
  note: string;
  iiVState?: WalkState['iiVState'];
}

/**
 * Advance through the diatonic scale degrees.
 *
 * @param algorithm  One of the diatonic algorithms
 * @param currentNote  Current chord root
 * @param rootNote     Key root
 * @param scaleType    Scale type
 * @param iiVState     Current ii-V walk state (for 'ii-v' only)
 */
export const nextChordDiatonic = (
  algorithm: 'diatonic-fifths' | 'diatonic-fourths' | 'diatonic-thirds' | 'ii-v' | 'random',
  currentNote: string,
  rootNote: string,
  scaleType: keyof typeof scales,
  iiVState?: WalkState['iiVState']
): DiatonicWalkResult => {
  const scaleNotes = getScaleNotes(rootNote, scaleType);
  const n = scaleNotes.length;
  if (n === 0) return { note: currentNote };

  const currentPos = getChromaticPosition(currentNote);
  const currentIdx = scaleNotes.findIndex(
    note => getChromaticPosition(note) === currentPos
  );
  // If current note is not in scale, snap to root
  const safeIdx = currentIdx === -1 ? 0 : currentIdx;

  switch (algorithm) {
    case 'diatonic-fifths':
      return { note: scaleNotes[(safeIdx + 4) % n] };

    case 'diatonic-fourths':
      return { note: scaleNotes[(safeIdx + 3) % n] };

    case 'diatonic-thirds':
      return { note: scaleNotes[(safeIdx + 2) % n] };

    case 'ii-v': {
      // ii-V-I walks targeting each diatonic chord in sequence.
      // State encodes: which targetDegree we're cycling toward, and
      // position within the ii-V-I group (0=ii, 1=V, 2=I).

      let state = iiVState;

      if (!state) {
        // Bootstrap: target degree 0 (I), about to emit ii (position 0)
        state = { position: 0, targetDegree: 0 };
      }

      const { position, targetDegree } = state;

      // The ii-V-I group for targetDegree D:
      //   position 0 → ii  = scaleNotes[(D - 2 + n) % n]
      //   position 1 → V   = scaleNotes[(D - 1 + n) % n]
      //   position 2 → I   = scaleNotes[D % n]
      let nextNote: string;
      let nextState: WalkState['iiVState'];

      if (position === 0) {
        // Emit ii
        nextNote = scaleNotes[(targetDegree - 2 + n) % n];
        nextState = { position: 1, targetDegree };
      } else if (position === 1) {
        // Emit V
        nextNote = scaleNotes[(targetDegree - 1 + n) % n];
        nextState = { position: 2, targetDegree };
      } else {
        // Emit I, then advance targetDegree for the next group
        nextNote = scaleNotes[targetDegree % n];
        const nextTarget = (targetDegree + 1) % n;
        nextState = { position: 0, targetDegree: nextTarget };
      }

      return { note: nextNote, iiVState: nextState };
    }

    case 'random': {
      // Random diatonic, no back-to-back repeats
      if (n === 1) return { note: scaleNotes[0] };
      let nextIdx: number;
      do {
        nextIdx = Math.floor(Math.random() * n);
      } while (nextIdx === safeIdx);
      return { note: scaleNotes[nextIdx] };
    }
  }
};

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

/**
 * Generate the next JamChord from any algorithm, returning both the chord
 * and the updated WalkState (relevant only for 'ii-v').
 */
export const generateNextChord = (
  algorithm: JamAlgorithm,
  currentNote: string,
  rootNote: string,
  scaleType: keyof typeof scales,
  walkState?: WalkState
): { chord: JamChord; walkState: WalkState } => {
  let nextNote: string;
  let nextWalkState: WalkState = {};

  switch (algorithm) {
    case 'fifths':
    case 'fourths':
    case 'skip1':
    case 'skip2':
      nextNote = nextChordChromatic(algorithm, currentNote);
      break;

    case 'diatonic-fifths':
    case 'diatonic-fourths':
    case 'diatonic-thirds':
    case 'random': {
      const result = nextChordDiatonic(algorithm, currentNote, rootNote, scaleType);
      nextNote = result.note;
      break;
    }

    case 'ii-v': {
      const result = nextChordDiatonic(
        'ii-v',
        currentNote,
        rootNote,
        scaleType,
        walkState?.iiVState
      );
      nextNote = result.note;
      nextWalkState = { iiVState: result.iiVState };
      break;
    }

    default:
      nextNote = currentNote;
  }

  const chord = buildJamChord(nextNote, rootNote, scaleType);
  return { chord, walkState: nextWalkState };
};

// ---------------------------------------------------------------------------
// Drum patterns
// ---------------------------------------------------------------------------

/**
 * Drum patterns for the three built-in styles.
 * Positions are in quarter-note beats (0-indexed) within one 4/4 bar.
 *   0    = beat 1
 *   0.5  = and-of-1
 *   1    = beat 2
 *   1.5  = and-of-2
 *   2    = beat 3
 *   2.5  = and-of-3
 *   3    = beat 4
 *   3.5  = and-of-4
 */
export const drumPatterns: Record<DrumPatternName, DrumHit[]> = {
  rock: [
    // Kick: beats 1 and 3
    { instrument: 'kick',  position: 0, gain: 1.0 },
    { instrument: 'kick',  position: 2, gain: 1.0 },
    // Snare: beats 2 and 4
    { instrument: 'snare', position: 1, gain: 1.0 },
    { instrument: 'snare', position: 3, gain: 1.0 },
    // Hat: every eighth note (8 hits)
    { instrument: 'hat', position: 0,    gain: 0.3 },
    { instrument: 'hat', position: 0.5,  gain: 0.3 },
    { instrument: 'hat', position: 1,    gain: 0.3 },
    { instrument: 'hat', position: 1.5,  gain: 0.3 },
    { instrument: 'hat', position: 2,    gain: 0.3 },
    { instrument: 'hat', position: 2.5,  gain: 0.3 },
    { instrument: 'hat', position: 3,    gain: 0.3 },
    { instrument: 'hat', position: 3.5,  gain: 0.3 },
  ],

  bossa: [
    // Kick: beat 1, and-of-2, beat 4
    { instrument: 'kick',  position: 0,   gain: 1.0 },
    { instrument: 'kick',  position: 1.5, gain: 0.8 },
    { instrument: 'kick',  position: 3,   gain: 1.0 },
    // Snare: beats 2 and 4 (lighter)
    { instrument: 'snare', position: 1,   gain: 0.3 },
    { instrument: 'snare', position: 3,   gain: 0.3 },
    // Hat: every eighth note
    { instrument: 'hat', position: 0,    gain: 0.3 },
    { instrument: 'hat', position: 0.5,  gain: 0.3 },
    { instrument: 'hat', position: 1,    gain: 0.3 },
    { instrument: 'hat', position: 1.5,  gain: 0.3 },
    { instrument: 'hat', position: 2,    gain: 0.3 },
    { instrument: 'hat', position: 2.5,  gain: 0.3 },
    { instrument: 'hat', position: 3,    gain: 0.3 },
    { instrument: 'hat', position: 3.5,  gain: 0.3 },
  ],

  hiphop: [
    // Kick: beat 1 and and-of-3
    { instrument: 'kick',  position: 0,   gain: 1.0 },
    { instrument: 'kick',  position: 2.5, gain: 0.9 },
    // Snare: beats 2 and 4
    { instrument: 'snare', position: 1,   gain: 1.0 },
    { instrument: 'snare', position: 3,   gain: 1.0 },
    // Hat: every sixteenth note (16 hits, gain 0.2)
    { instrument: 'hat', position: 0,     gain: 0.2 },
    { instrument: 'hat', position: 0.25,  gain: 0.2 },
    { instrument: 'hat', position: 0.5,   gain: 0.2 },
    { instrument: 'hat', position: 0.75,  gain: 0.2 },
    { instrument: 'hat', position: 1,     gain: 0.2 },
    { instrument: 'hat', position: 1.25,  gain: 0.2 },
    { instrument: 'hat', position: 1.5,   gain: 0.2 },
    { instrument: 'hat', position: 1.75,  gain: 0.2 },
    { instrument: 'hat', position: 2,     gain: 0.2 },
    { instrument: 'hat', position: 2.25,  gain: 0.2 },
    { instrument: 'hat', position: 2.5,   gain: 0.2 },
    { instrument: 'hat', position: 2.75,  gain: 0.2 },
    { instrument: 'hat', position: 3,     gain: 0.2 },
    { instrument: 'hat', position: 3.25,  gain: 0.2 },
    { instrument: 'hat', position: 3.5,   gain: 0.2 },
    { instrument: 'hat', position: 3.75,  gain: 0.2 },
  ],
};

// ---------------------------------------------------------------------------
// Preset queue builder
// ---------------------------------------------------------------------------

// Map base roman numeral text → scale degree index (0-based)
const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6,
};

// Map suffix string → chord type key
const SUFFIX_TO_TYPE: Record<string, keyof typeof chordTypes> = {
  '7':   'dominant7',
  'maj7': 'major7',
  'm7':  'minor7',
  '°7':  'diminished7',
  'ø7':  'half-diminished7',
  '°':   'diminished',
  // Extended → treat as 7th equivalent for MVP
  '9':    'dominant7',
  '13':   'dominant7',
  'maj9': 'major7',
  'm9':   'minor7',
};

/**
 * Parse a roman numeral string like 'bVII', '#IV°7', 'ii7', 'Imaj7', 'I/V'.
 * Returns `{ accidental, base, suffix }`.
 */
const parseRomanNumeral = (
  roman: string
): { accidental: '' | 'b' | '#'; base: string; suffix: string } => {
  // Strip slash-bass notation
  const noSlash = roman.split('/')[0];

  // Extract leading accidental
  let accidental: '' | 'b' | '#' = '';
  let rest = noSlash;
  if (rest.startsWith('b') && rest.length > 1 && rest[1] === rest[1].toUpperCase() && rest[1] !== rest[1].toLowerCase()) {
    accidental = 'b';
    rest = rest.slice(1);
  } else if (rest.startsWith('#')) {
    accidental = '#';
    rest = rest.slice(1);
  }

  // Normalise case so we can match base: 'ii' → 'II', 'IV' → 'IV'
  const upper = rest.toUpperCase();

  // Extract base roman numeral (longest match first: VII, VI, IV, III, II, I, V)
  const baseNumerals = ['VII', 'VI', 'IV', 'III', 'II', 'I', 'V'];
  let base = '';
  let suffix = '';
  for (const candidate of baseNumerals) {
    if (upper.startsWith(candidate)) {
      base = candidate;
      // Suffix is everything after the base — preserve original casing
      suffix = rest.slice(candidate.length);
      break;
    }
  }

  if (!base) {
    // Fallback: treat whole string (minus accidental) as base, no suffix
    base = upper;
    suffix = '';
  }

  return { accidental, base, suffix };
};

/**
 * Build a JamChord[] from an array of roman numeral strings.
 */
export const buildPresetQueue = (
  romanNumerals: string[],
  rootNote: string,
  scaleType: keyof typeof scales
): JamChord[] => {
  const scaleNotes = getScaleNotes(rootNote, scaleType);
  const n = scaleNotes.length;
  if (n === 0) return [];

  // Chromatic scale for semitone math
  const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flats  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const rootPos = getChromaticPosition(rootNote);

  // Does the root key use flats?
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  const useFlats = flatKeys.includes(rootNote);
  const chromaticRef = useFlats ? flats : sharps;

  return romanNumerals.map(numStr => {
    const { accidental, base, suffix } = parseRomanNumeral(numStr);

    const degreeIdx = ROMAN_TO_DEGREE[base] ?? 0;

    // Clamp degree index to scale length
    const scaleDegreeIdx = degreeIdx % n;
    const scaleNote = scaleNotes[scaleDegreeIdx];
    let notePos = getChromaticPosition(scaleNote);

    // Apply accidental
    if (accidental === 'b') {
      notePos = (notePos - 1 + 12) % 12;
    } else if (accidental === '#') {
      notePos = (notePos + 1) % 12;
    }

    // Absolute chromatic position from root
    const absPos = (rootPos + ((notePos - rootPos + 12) % 12)) % 12;
    // Resolve to note name
    const note = chromaticRef.find(nn => getChromaticPosition(nn) === absPos) ?? chromaticRef[absPos];

    // Determine chord type
    let type: string;
    let symbol: string;

    if (suffix && SUFFIX_TO_TYPE[suffix]) {
      const ct = SUFFIX_TO_TYPE[suffix];
      type = ct;
      symbol = chordTypes[ct].symbol;
    } else if (accidental === '' && suffix === '') {
      // Diatonic with no suffix → scale-derived quality
      const q = getChordQuality(note, rootNote, scaleType);
      type = q.type;
      symbol = q.symbol;
    } else {
      // Chromatic with no recognised suffix → getChordQuality fallback
      const q = getChordQuality(note, rootNote, scaleType);
      type = q.type;
      symbol = q.symbol;
    }

    const roman = romanLabel(note, type, rootNote, scaleType);
    const midi = chordToMidi(note, type);

    return { note, type, symbol, roman, midi };
  });
};
