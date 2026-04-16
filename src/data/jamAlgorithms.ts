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
export type DrumInstrument = 'kick' | 'snare' | 'hat' | 'openhat';

export interface DrumHit {
  instrument: DrumInstrument;
  position: number;
  gain: number;
  accent?: boolean; // true for hits that should be louder (beat 1, snare hits)
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

  // Extract the optional accidental prefix ('b' or '#') and the degree letters
  const prefixMatch = numeral.match(/^([b#]?)(.+)$/);
  const prefix = prefixMatch?.[1] ?? '';
  const degree = prefixMatch?.[2] ?? numeral;

  if (isDim) {
    return prefix + degree.toLowerCase() + '°';
  }
  if (isMinor) {
    return prefix + degree.toLowerCase();
  }
  // Major / augmented / dominant — degree stays uppercase
  return prefix + degree.toUpperCase();
}

// ---------------------------------------------------------------------------
// Unified chord builder
// ---------------------------------------------------------------------------

/**
 * Build a full JamChord for `note` in the given key/scale context.
 */
/** Clamp any chord type to just major or minor. Diminished/half-dim → minor,
 *  augmented/dominant → major. Keeps things simple and harmonically varied. */
const clampType = (type: string): { type: string; symbol: string } => {
  switch (type) {
    case 'minor':
    case 'minor7':
    case 'diminished':
    case 'diminished7':
    case 'half-diminished7':
      return { type: 'minor', symbol: chordTypes.minor.symbol };
    default:
      return { type: 'major', symbol: chordTypes.major.symbol };
  }
};

export const buildJamChord = (
  note: string,
  rootNote: string,
  scaleType: keyof typeof scales
): JamChord => {
  const raw = getChordQuality(note, rootNote, scaleType);
  const { type, symbol } = clampType(raw.type);
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
    { instrument: 'kick',  position: 0, gain: 1.0, accent: true },
    { instrument: 'kick',  position: 2, gain: 1.0 },
    // Snare: beats 2 and 4
    { instrument: 'snare', position: 1, gain: 1.0, accent: true },
    { instrument: 'snare', position: 3, gain: 1.0, accent: true },
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
    { instrument: 'kick',  position: 0,   gain: 1.0, accent: true },
    { instrument: 'kick',  position: 1.5, gain: 0.8 },
    { instrument: 'kick',  position: 3,   gain: 1.0 },
    // Snare: beats 2 and 4 (lighter)
    { instrument: 'snare', position: 1,   gain: 0.3, accent: true },
    { instrument: 'snare', position: 3,   gain: 0.3, accent: true },
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
    { instrument: 'kick',  position: 0,   gain: 1.0, accent: true },
    { instrument: 'kick',  position: 2.5, gain: 0.9 },
    // Snare: beats 2 and 4
    { instrument: 'snare', position: 1,   gain: 1.0, accent: true },
    { instrument: 'snare', position: 3,   gain: 1.0, accent: true },
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
// Velocity humanization — adds ±variation to a base gain, clamped 0–1.
// Call per-hit in the scheduler for a more natural feel.
// ---------------------------------------------------------------------------

/** Return a slightly randomized gain for humanized velocity.
 *  Returns 0 when baseGain is 0 (so muting via slider=0 is truly silent). */
export const humanize = (baseGain: number, variation = 0.15): number => {
  if (baseGain <= 0) return 0;
  const offset = (Math.random() * 2 - 1) * variation * baseGain;
  return Math.max(0, Math.min(1, baseGain + offset));
};

/** Micro-timing humanization — shifts an audio time by ±variation seconds.
 *  Apply only to non-downbeat hits so the downbeat stays rock-solid. */
export const humanizeTime = (baseTime: number, variation = 0.008): number => {
  return baseTime + (Math.random() - 0.5) * 2 * variation;
};

// ---------------------------------------------------------------------------
// Swing / groove — per-style timing shift for odd subdivisions.
// ---------------------------------------------------------------------------

/**
 * Swing ratio per drum pattern style. 0.5 = straight, 0.58 = moderate swing,
 * 0.66 = shuffle triplet. Values below 0.52 are inaudible; above 0.66 feels
 * hard shuffle. Tuned to match genre norms:
 *  - rock: straight
 *  - bossa: subtle (classic bossa 8ths are slightly swung)
 *  - hiphop: MPC-style ~56% — the "boom-bap" feel
 */
export const DRUM_PATTERN_SWING: Record<DrumPatternName, number> = {
  rock:   0.50,
  bossa:  0.54,
  hiphop: 0.56,
};

/**
 * Shift a beat position by swing ratio. `subdivision` is the grid unit
 * (0.5 for 8ths, 0.25 for 16ths). Positions on the grid stay put;
 * off-subdivision positions (the "and" between grid points) shift later.
 *
 * At ratio=0.5 this is a no-op.
 */
export const applySwing = (
  position: number,
  ratio: number,
  subdivision = 0.5,
): number => {
  if (ratio === 0.5) return position;
  const unit = subdivision * 2;        // length of one paired group (e.g. 1.0 for 8ths)
  const phase = position % unit;       // 0 = on-grid, subdivision = off-grid
  // Only shift the off-grid half (phase in [subdivision, unit)).
  if (phase < subdivision - 1e-6) return position;
  const shift = (ratio - 0.5) * 2 * subdivision;   // ratio=0.58, sub=0.5 → +0.08
  return position + shift;
};

// ---------------------------------------------------------------------------
// Chord voicing — drop-2 with bass root and optional dominant 7th.
// Takes the bare triad that lives in JamChord.midi and spreads it across
// ~1.5 octaves for an open, pianistic sound. Adds a minor 7th on top when
// the chord is functioning as a dominant (V or symbol with `7`).
// ---------------------------------------------------------------------------

/**
 * Detect whether a chord is acting as a dominant.
 *
 * Triggers:
 *   - roman numeral is 'V' (case-insensitive match, with/without accidental)
 *   - chord symbol already contains '7' (dominant7/major7/minor7 etc. all
 *     benefit from the 7th in the voicing — but we only add the minor 7
 *     which stays consonant with major triads)
 */
export const isDominantContext = (chord: JamChord): boolean => {
  const romanBase = chord.roman.replace(/^[b#]/, '').toUpperCase();
  if (romanBase.startsWith('V') && !romanBase.startsWith('VI') && !romanBase.startsWith('VII')) {
    return true;
  }
  if (chord.symbol.includes('7')) return true;
  return false;
};

/**
 * Build a rich voicing for the chord pad.
 *
 * Layout (low → high):
 *   [ bass root (oct 2) , 3rd (oct 3) , 5th (oct 3) , [7th (oct 3)], root (oct 4) ]
 *
 * Then drop-2 is applied: the second-from-top note is dropped an octave.
 * This produces an open voicing with clear separation between bass and
 * upper structure — no more cluster-in-one-octave mud.
 *
 * `spice` (0-1) — probability of adding a colour note (9th / 6th / high-3rd)
 * for variety on that specific hit. Applied non-deterministically so repeated
 * hits on the same chord don't sound mechanical.
 */
export const buildVoicing = (
  chord: JamChord,
  isDominant: boolean,
  spice = 0,
): number[] => {
  const [root, third, fifth] = chord.midi;
  if (root == null) return [];

  const voicing: number[] = [];
  // Bass root, octave down from existing triad.
  voicing.push(root - 12);
  // 3rd & 5th from the existing triad (already in oct 3).
  if (third != null) voicing.push(third);
  if (fifth != null) voicing.push(fifth);
  // Optional minor 7th for dominant colour.
  if (isDominant) voicing.push(root + 10);
  // Root an octave above.
  voicing.push(root + 12);

  // Drop-2: take the 2nd-highest note and drop it an octave. For a 4-note
  // voicing (no 7th) this pulls the 5th down into the bass register; for a
  // 5-note voicing (with 7th) it pulls the 7th down. Both sound open.
  if (voicing.length >= 2) {
    const dropIdx = voicing.length - 2;
    voicing[dropIdx] = voicing[dropIdx] - 12;
  }

  // Spice: occasionally stack a colour note on top for extra interest.
  //   - 9th:   root + 14 (octave + 2)
  //   - 6th:   root + 9  (major 6)
  //   - high-3rd: third + 12 (upper-octave 3rd, doubles for piano-like bell)
  if (spice > 0 && Math.random() < spice) {
    const r = Math.random();
    if (r < 0.4) {
      voicing.push(root + 14); // add 9
    } else if (r < 0.75) {
      voicing.push(root + 9);  // add 6
    } else if (third != null) {
      voicing.push(third + 12); // doubled 3rd on top
    }
  }

  // Sort ascending so strum-by-order still reads low-to-high.
  voicing.sort((a, b) => a - b);
  return voicing;
};

/**
 * Voice-led voicing builder.
 *
 * Keeps the bass root fixed one octave below the chord, then for each
 * pitch-class in the chord (root, 3rd, 5th, optional 7th) finds the octave
 * placement in MIDI range [55–80] nearest to the previous voicing. The sum
 * of (for each previous upper voice, the min distance to any candidate
 * pitch) is the "movement cost" — we minimise it. Result: common tones stay
 * put, and voices move by the smallest possible step.
 *
 * If `prevVoicing` is empty, falls back to `buildVoicing` (drop-2 default).
 */
export const buildVoicingVoiceLed = (
  chord: JamChord,
  isDominant: boolean,
  prevVoicing: number[],
  spice = 0,
): number[] => {
  if (prevVoicing.length === 0) {
    return buildVoicing(chord, isDominant, spice);
  }
  const [root, third, fifth] = chord.midi;
  if (root == null) return [];

  const bassMidi = root - 12;
  const prevUppers = prevVoicing.filter(m => m > bassMidi);

  // Pitch classes we need to voice in the upper register.
  const pitchClasses: number[] = [];
  if (third != null) pitchClasses.push(third % 12);
  if (fifth != null) pitchClasses.push(fifth % 12);
  pitchClasses.push(root % 12);  // at least one octave-above-bass root
  if (isDominant) pitchClasses.push((root + 10) % 12);  // min-7

  // For each pitch class, pick the single octave placement closest to
  // *some* previous upper voice. Independent per pitch class → greedy but
  // effective and cheap.
  const upper: number[] = [];
  for (const pc of pitchClasses) {
    let bestMidi = 60 + pc;  // fallback ~middle C-ish
    let bestDist = Infinity;
    for (let oct = 3; oct <= 5; oct++) {
      const m = pc + (oct + 1) * 12;  // MIDI: C3=48, C4=60, C5=72...
      if (m < 55 || m > 82) continue;
      // Distance to nearest previous upper voice.
      let d = Infinity;
      for (const p of prevUppers) {
        d = Math.min(d, Math.abs(m - p));
      }
      if (d < bestDist) {
        bestDist = d;
        bestMidi = m;
      }
    }
    upper.push(bestMidi);
  }

  // Deduplicate (same pitch picked twice → drop one).
  const dedup = Array.from(new Set(upper));

  // Spice: occasional color note at the top.
  if (spice > 0 && Math.random() < spice) {
    const r = Math.random();
    if (r < 0.4) dedup.push(root + 14);        // 9th
    else if (r < 0.75) dedup.push(root + 21);  // 13th
    else if (third != null) dedup.push(third + 12);
  }

  const voicing = [bassMidi, ...dedup].sort((a, b) => a - b);
  return voicing;
};

// ---------------------------------------------------------------------------
// Bass patterns — played on the chord root (or fifth) one octave below.
// See bassPatternBank below for the full set of variations.
// ---------------------------------------------------------------------------

export interface BassHit {
  position: number;    // quarter-note beats within one bar (0-indexed)
  degree: 'root' | 'fifth';
  gain: number;
  duration: number;    // note length in beats
}

/** Get the bass MIDI note for a chord — root or fifth, one octave below voicing. */
export const bassMidi = (chord: JamChord, degree: 'root' | 'fifth'): number => {
  const root = chord.midi[0]; // lowest note in the chord voicing
  const bassRoot = root - 12; // one octave down
  if (degree === 'fifth') {
    return bassRoot + 7; // perfect fifth above bass root
  }
  return bassRoot;
};

// ---------------------------------------------------------------------------
// Strum patterns — arpeggiated chord voicings for rhythm guitar feel.
// See strumPatternBank below for the full set of variations.
// ---------------------------------------------------------------------------

export interface StrumHit {
  position: number;          // quarter-note beats within one bar
  direction: 'down' | 'up'; // down = low-to-high, up = high-to-low
  gain: number;
  /** How many of the chord's notes to play (0 = all). */
  notes: number;
}

// ---------------------------------------------------------------------------
// Bar-1 drum variants — keep drums with a stable bar-0/bar-1 feel (not
// random) so the listener feels a 2-bar loop. Bass and strum use the random
// banks below for higher variety.
// ---------------------------------------------------------------------------

/** Bar-1 drum variations. Rock drops the kick on beat 3 and opens the hat on
 *  the and-of-4. Bossa and hiphop stay identical (their base patterns are
 *  already syncopated enough that variation would feel disruptive). */
export const drumPatternsBar1: Partial<Record<DrumPatternName, DrumHit[]>> = {
  rock: [
    { instrument: 'kick',  position: 0, gain: 1.0, accent: true },
    { instrument: 'snare', position: 1, gain: 1.0, accent: true },
    { instrument: 'snare', position: 3, gain: 1.0, accent: true },
    { instrument: 'hat',     position: 0,    gain: 0.3 },
    { instrument: 'hat',     position: 0.5,  gain: 0.3 },
    { instrument: 'hat',     position: 1,    gain: 0.3 },
    { instrument: 'hat',     position: 1.5,  gain: 0.3 },
    { instrument: 'hat',     position: 2,    gain: 0.3 },
    { instrument: 'hat',     position: 2.5,  gain: 0.3 },
    { instrument: 'hat',     position: 3,    gain: 0.3 },
    { instrument: 'openhat', position: 3.5,  gain: 0.5 },
  ],
};

// ---------------------------------------------------------------------------
// Bass pattern bank — ~10 variations per style. Scheduler picks one at
// random on each downbeat so no two bars feel identical.
// ---------------------------------------------------------------------------

export const bassPatternBank: Record<DrumPatternName, BassHit[][]> = {
  rock: [
    // 1. Classic root-fifth-root
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 1.5 },
      { position: 2,   degree: 'fifth', gain: 0.7, duration: 0.8 },
      { position: 2.5, degree: 'root',  gain: 0.6, duration: 0.4 },
    ],
    // 2. Root pedal on all four beats
    [
      { position: 0, degree: 'root', gain: 0.9, duration: 0.9 },
      { position: 1, degree: 'root', gain: 0.7, duration: 0.9 },
      { position: 2, degree: 'root', gain: 0.8, duration: 0.9 },
      { position: 3, degree: 'root', gain: 0.7, duration: 0.9 },
    ],
    // 3. Walking: root, fifth, root, fifth
    [
      { position: 0, degree: 'root',  gain: 0.9, duration: 0.9 },
      { position: 1, degree: 'fifth', gain: 0.7, duration: 0.9 },
      { position: 2, degree: 'root',  gain: 0.8, duration: 0.9 },
      { position: 3, degree: 'fifth', gain: 0.7, duration: 0.9 },
    ],
    // 4. Long root sustained whole bar
    [
      { position: 0, degree: 'root', gain: 0.95, duration: 3.8 },
    ],
    // 5. Pumping eighths on beats 1-2
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 0.4 },
      { position: 0.5, degree: 'root',  gain: 0.7, duration: 0.4 },
      { position: 1,   degree: 'root',  gain: 0.8, duration: 0.4 },
      { position: 1.5, degree: 'root',  gain: 0.6, duration: 0.4 },
      { position: 2,   degree: 'fifth', gain: 0.75, duration: 1.0 },
      { position: 3,   degree: 'root',  gain: 0.75, duration: 1.0 },
    ],
    // 6. Syncopated push on and-of-2
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 1.4 },
      { position: 1.5, degree: 'fifth', gain: 0.7, duration: 1.4 },
      { position: 3,   degree: 'root',  gain: 0.75, duration: 0.9 },
    ],
    // 7. Pickup going into the next chord
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 1.4 },
      { position: 2,   degree: 'fifth', gain: 0.7, duration: 0.8 },
      { position: 2.75, degree: 'root', gain: 0.6, duration: 0.2 },
      { position: 3.5, degree: 'fifth', gain: 0.7, duration: 0.4 },
    ],
    // 8. Beat 1 and beat 3 only (halves)
    [
      { position: 0, degree: 'root', gain: 0.95, duration: 1.8 },
      { position: 2, degree: 'root', gain: 0.85, duration: 1.8 },
    ],
    // 9. Dotted quarter root, fifth rebound
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 1.3 },
      { position: 1.5, degree: 'root',  gain: 0.7, duration: 0.4 },
      { position: 2,   degree: 'fifth', gain: 0.75, duration: 1.9 },
    ],
    // 10. Full-bar root + accent on and-of-3
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 2.4 },
      { position: 2.5, degree: 'fifth', gain: 0.65, duration: 0.4 },
      { position: 3,   degree: 'root',  gain: 0.75, duration: 0.9 },
    ],
  ],

  bossa: [
    // 1. Classic bossa root/and-of-2/fifth-and-of-3/root-4
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 1.0 },
      { position: 1.5, degree: 'root',  gain: 0.7, duration: 0.4 },
      { position: 2.5, degree: 'fifth', gain: 0.6, duration: 0.4 },
      { position: 3,   degree: 'root',  gain: 0.7, duration: 0.8 },
    ],
    // 2. Simpler bossa: root on 1 and 3
    [
      { position: 0, degree: 'root', gain: 0.9, duration: 1.8 },
      { position: 2, degree: 'root', gain: 0.8, duration: 1.8 },
    ],
    // 3. Samba push
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 0.8 },
      { position: 1,   degree: 'fifth', gain: 0.6, duration: 0.4 },
      { position: 1.5, degree: 'root',  gain: 0.75, duration: 0.8 },
      { position: 2.5, degree: 'fifth', gain: 0.65, duration: 0.4 },
      { position: 3,   degree: 'root',  gain: 0.75, duration: 0.9 },
    ],
    // 4. Long sustained root with fifth pickup
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 2.8 },
      { position: 3.5, degree: 'fifth', gain: 0.55, duration: 0.4 },
    ],
    // 5. Tumbao-lite: 1, and-of-2, 3.5
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 1.2 },
      { position: 1.5, degree: 'fifth', gain: 0.65, duration: 1.2 },
      { position: 3,   degree: 'root',  gain: 0.7, duration: 0.9 },
    ],
    // 6. Four on the floor (steady)
    [
      { position: 0, degree: 'root',  gain: 0.85, duration: 0.9 },
      { position: 1, degree: 'root',  gain: 0.7,  duration: 0.9 },
      { position: 2, degree: 'fifth', gain: 0.75, duration: 0.9 },
      { position: 3, degree: 'root',  gain: 0.75, duration: 0.9 },
    ],
    // 7. Syncopated anticipation
    [
      { position: 0,   degree: 'root',  gain: 0.9, duration: 0.8 },
      { position: 0.75, degree: 'fifth', gain: 0.55, duration: 0.4 },
      { position: 1.5, degree: 'root',  gain: 0.75, duration: 1.3 },
      { position: 3,   degree: 'root',  gain: 0.7, duration: 0.9 },
    ],
    // 8. Bossa partido alto
    [
      { position: 0,    degree: 'root',  gain: 0.9,  duration: 0.9 },
      { position: 1,    degree: 'root',  gain: 0.65, duration: 0.4 },
      { position: 1.75, degree: 'fifth', gain: 0.6,  duration: 0.4 },
      { position: 2.5,  degree: 'root',  gain: 0.7,  duration: 0.9 },
      { position: 3.5,  degree: 'fifth', gain: 0.55, duration: 0.4 },
    ],
    // 9. Mellow half-notes
    [
      { position: 0, degree: 'root',  gain: 0.85, duration: 1.9 },
      { position: 2, degree: 'fifth', gain: 0.75, duration: 1.9 },
    ],
    // 10. Fifth-centered vamp
    [
      { position: 0,   degree: 'fifth', gain: 0.85, duration: 1.0 },
      { position: 1.5, degree: 'root',  gain: 0.8,  duration: 1.3 },
      { position: 3,   degree: 'fifth', gain: 0.7,  duration: 0.9 },
    ],
  ],

  hiphop: [
    // 1. Sustained root + and-of-3 bump
    [
      { position: 0,   degree: 'root', gain: 1.0, duration: 2.0 },
      { position: 2.5, degree: 'root', gain: 0.7, duration: 0.5 },
    ],
    // 2. Root on 1 and and-of-3 only (classic boom-bap bass)
    [
      { position: 0,   degree: 'root', gain: 1.0, duration: 0.8 },
      { position: 2.75, degree: 'root', gain: 0.8, duration: 0.4 },
    ],
    // 3. 808-style long root
    [
      { position: 0, degree: 'root', gain: 1.0, duration: 3.5 },
    ],
    // 4. Root + fifth octave jump
    [
      { position: 0,   degree: 'root',  gain: 1.0, duration: 1.4 },
      { position: 2,   degree: 'fifth', gain: 0.75, duration: 0.9 },
      { position: 3,   degree: 'root',  gain: 0.85, duration: 0.9 },
    ],
    // 5. Syncopated slides on and-of-beats
    [
      { position: 0,   degree: 'root',  gain: 1.0, duration: 1.0 },
      { position: 1.5, degree: 'fifth', gain: 0.6, duration: 0.4 },
      { position: 2,   degree: 'root',  gain: 0.85, duration: 1.4 },
    ],
    // 6. Trap bounce
    [
      { position: 0,    degree: 'root', gain: 1.0, duration: 0.5 },
      { position: 0.5,  degree: 'root', gain: 0.7, duration: 0.4 },
      { position: 1.75, degree: 'root', gain: 0.8, duration: 0.4 },
      { position: 2.5,  degree: 'root', gain: 0.75, duration: 0.9 },
    ],
    // 7. Minimal — just beat 1
    [
      { position: 0, degree: 'root', gain: 1.0, duration: 1.2 },
    ],
    // 8. Fifth-pushed
    [
      { position: 0,   degree: 'root',  gain: 1.0, duration: 0.9 },
      { position: 1.5, degree: 'fifth', gain: 0.7, duration: 0.9 },
      { position: 3,   degree: 'root',  gain: 0.85, duration: 0.9 },
    ],
    // 9. Two-beat pattern repeated
    [
      { position: 0,   degree: 'root',  gain: 1.0, duration: 0.9 },
      { position: 1.5, degree: 'root',  gain: 0.75, duration: 0.4 },
      { position: 2,   degree: 'root',  gain: 0.9, duration: 0.9 },
      { position: 3.5, degree: 'root',  gain: 0.7, duration: 0.4 },
    ],
    // 10. Slow thump on beat 1 + beat 3.5 ghost
    [
      { position: 0,   degree: 'root', gain: 1.0, duration: 2.3 },
      { position: 3.5, degree: 'fifth', gain: 0.5, duration: 0.4 },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Strum pattern bank — ~10 variations per style. Random per bar.
// ---------------------------------------------------------------------------

export const strumPatternBank: Record<DrumPatternName, StrumHit[][]> = {
  rock: [
    // 1. Classic D-D-U-D-D-U
    [
      { position: 0,   direction: 'down', gain: 0.7, notes: 0 },
      { position: 1,   direction: 'down', gain: 0.6, notes: 0 },
      { position: 1.5, direction: 'up',   gain: 0.45, notes: 3 },
      { position: 2,   direction: 'down', gain: 0.7, notes: 0 },
      { position: 3,   direction: 'down', gain: 0.6, notes: 0 },
      { position: 3.5, direction: 'up',   gain: 0.45, notes: 3 },
    ],
    // 2. All downs on every quarter
    [
      { position: 0, direction: 'down', gain: 0.7, notes: 0 },
      { position: 1, direction: 'down', gain: 0.6, notes: 0 },
      { position: 2, direction: 'down', gain: 0.7, notes: 0 },
      { position: 3, direction: 'down', gain: 0.6, notes: 0 },
    ],
    // 3. Sparse — downs on 1 and 3 only
    [
      { position: 0, direction: 'down', gain: 0.75, notes: 0 },
      { position: 2, direction: 'down', gain: 0.7,  notes: 0 },
    ],
    // 4. Pop D-U-D-U-D-U-D-U (eighths alternating)
    [
      { position: 0,   direction: 'down', gain: 0.7, notes: 0 },
      { position: 0.5, direction: 'up',   gain: 0.4, notes: 3 },
      { position: 1,   direction: 'down', gain: 0.6, notes: 0 },
      { position: 1.5, direction: 'up',   gain: 0.4, notes: 3 },
      { position: 2,   direction: 'down', gain: 0.7, notes: 0 },
      { position: 2.5, direction: 'up',   gain: 0.4, notes: 3 },
      { position: 3,   direction: 'down', gain: 0.6, notes: 0 },
      { position: 3.5, direction: 'up',   gain: 0.4, notes: 3 },
    ],
    // 5. Reggae — offbeat ups only
    [
      { position: 0.5, direction: 'up', gain: 0.55, notes: 3 },
      { position: 1.5, direction: 'up', gain: 0.55, notes: 3 },
      { position: 2.5, direction: 'up', gain: 0.55, notes: 3 },
      { position: 3.5, direction: 'up', gain: 0.55, notes: 3 },
    ],
    // 6. Heavy downs (chuck style)
    [
      { position: 0, direction: 'down', gain: 0.8, notes: 0 },
      { position: 1, direction: 'down', gain: 0.7, notes: 0 },
      { position: 2, direction: 'down', gain: 0.8, notes: 0 },
      { position: 3, direction: 'down', gain: 0.7, notes: 0 },
    ],
    // 7. Syncopated push
    [
      { position: 0,   direction: 'down', gain: 0.7,  notes: 0 },
      { position: 1.5, direction: 'up',   gain: 0.55, notes: 4 },
      { position: 2,   direction: 'down', gain: 0.7,  notes: 0 },
      { position: 3.5, direction: 'up',   gain: 0.55, notes: 4 },
    ],
    // 8. Galloping eighths on beats 1, 3
    [
      { position: 0,   direction: 'down', gain: 0.7, notes: 0 },
      { position: 0.5, direction: 'down', gain: 0.55, notes: 3 },
      { position: 1,   direction: 'up',   gain: 0.4, notes: 3 },
      { position: 2,   direction: 'down', gain: 0.7, notes: 0 },
      { position: 2.5, direction: 'down', gain: 0.55, notes: 3 },
      { position: 3,   direction: 'up',   gain: 0.4, notes: 3 },
    ],
    // 9. Ballad half-time
    [
      { position: 0, direction: 'down', gain: 0.75, notes: 0 },
      { position: 2, direction: 'up',   gain: 0.45, notes: 4 },
    ],
    // 10. Power stabs on 1-and-2, 3-and-4
    [
      { position: 0,   direction: 'down', gain: 0.8, notes: 0 },
      { position: 0.5, direction: 'up',   gain: 0.5, notes: 3 },
      { position: 1,   direction: 'down', gain: 0.65, notes: 0 },
      { position: 2,   direction: 'down', gain: 0.8, notes: 0 },
      { position: 2.5, direction: 'up',   gain: 0.5, notes: 3 },
      { position: 3,   direction: 'down', gain: 0.65, notes: 0 },
    ],
  ],

  bossa: [
    // 1. Fingerpick-style sparse
    [
      { position: 0,   direction: 'down', gain: 0.6, notes: 0 },
      { position: 1,   direction: 'up',   gain: 0.35, notes: 2 },
      { position: 1.5, direction: 'down', gain: 0.5,  notes: 3 },
      { position: 3,   direction: 'up',   gain: 0.4,  notes: 2 },
      { position: 3.5, direction: 'down', gain: 0.35, notes: 3 },
    ],
    // 2. Two-feel — hits on 1 and 3
    [
      { position: 0, direction: 'down', gain: 0.65, notes: 0 },
      { position: 2, direction: 'down', gain: 0.6,  notes: 4 },
    ],
    // 3. Samba-ish syncopation
    [
      { position: 0.5, direction: 'up',   gain: 0.4,  notes: 2 },
      { position: 1,   direction: 'down', gain: 0.55, notes: 3 },
      { position: 2.5, direction: 'up',   gain: 0.4,  notes: 2 },
      { position: 3,   direction: 'down', gain: 0.55, notes: 3 },
    ],
    // 4. Chord on every half-note only
    [
      { position: 0, direction: 'down', gain: 0.55, notes: 0 },
      { position: 2, direction: 'down', gain: 0.5,  notes: 0 },
    ],
    // 5. And-of-1 up, 2, and-of-3 down
    [
      { position: 0.5, direction: 'up',   gain: 0.4,  notes: 3 },
      { position: 2,   direction: 'down', gain: 0.55, notes: 0 },
      { position: 2.5, direction: 'down', gain: 0.4,  notes: 3 },
    ],
    // 6. Classic bossa-nova comp
    [
      { position: 0,   direction: 'down', gain: 0.6, notes: 0 },
      { position: 1.5, direction: 'down', gain: 0.55, notes: 4 },
      { position: 2,   direction: 'up',   gain: 0.4,  notes: 2 },
      { position: 3.5, direction: 'down', gain: 0.45, notes: 3 },
    ],
    // 7. Sustained — one chord hit per bar
    [
      { position: 0, direction: 'down', gain: 0.6, notes: 0 },
    ],
    // 8. Push on 2.5
    [
      { position: 0,   direction: 'down', gain: 0.55, notes: 0 },
      { position: 2.5, direction: 'up',   gain: 0.5,  notes: 4 },
    ],
    // 9. Both ends — and-of-1 and and-of-4
    [
      { position: 0,   direction: 'down', gain: 0.55, notes: 0 },
      { position: 0.5, direction: 'up',   gain: 0.4,  notes: 3 },
      { position: 2,   direction: 'down', gain: 0.55, notes: 0 },
      { position: 3.5, direction: 'up',   gain: 0.4,  notes: 3 },
    ],
    // 10. Subtle triplet-feel
    [
      { position: 0,    direction: 'down', gain: 0.55, notes: 0 },
      { position: 1.33, direction: 'up',   gain: 0.35, notes: 2 },
      { position: 2,    direction: 'down', gain: 0.5,  notes: 3 },
      { position: 3.33, direction: 'up',   gain: 0.35, notes: 2 },
    ],
  ],

  hiphop: [
    // 1. Minimal — 2 and 4 stabs
    [
      { position: 1, direction: 'down', gain: 0.45, notes: 0 },
      { position: 3, direction: 'down', gain: 0.45, notes: 0 },
    ],
    // 2. Only beat 1
    [
      { position: 0, direction: 'down', gain: 0.5, notes: 0 },
    ],
    // 3. Beat 1 + and-of-3
    [
      { position: 0,   direction: 'down', gain: 0.5,  notes: 0 },
      { position: 2.5, direction: 'up',   gain: 0.4,  notes: 3 },
    ],
    // 4. Chord stabs on every eighth of beat 2
    [
      { position: 1,   direction: 'down', gain: 0.5, notes: 0 },
      { position: 1.5, direction: 'up',   gain: 0.35, notes: 3 },
      { position: 3,   direction: 'down', gain: 0.45, notes: 0 },
    ],
    // 5. Silent strum (chords only, no strum part) — empty pattern
    [],
    // 6. Swelled chord on beat 2
    [
      { position: 1, direction: 'down', gain: 0.55, notes: 0 },
    ],
    // 7. Off-grid accent
    [
      { position: 0.75, direction: 'up',   gain: 0.4,  notes: 3 },
      { position: 2,    direction: 'down', gain: 0.5,  notes: 0 },
    ],
    // 8. Three stabs
    [
      { position: 0, direction: 'down', gain: 0.45, notes: 0 },
      { position: 1, direction: 'down', gain: 0.45, notes: 0 },
      { position: 3, direction: 'down', gain: 0.45, notes: 0 },
    ],
    // 9. Downbeat + and-of-4 pickup
    [
      { position: 0,   direction: 'down', gain: 0.5,  notes: 0 },
      { position: 3.5, direction: 'up',   gain: 0.4,  notes: 3 },
    ],
    // 10. Chord on beat 3 only (reverse feel)
    [
      { position: 2, direction: 'down', gain: 0.55, notes: 0 },
    ],
  ],
};

/** Pick a random pattern from a bank. Returns `null` if the bank is empty. */
export const pickRandomPattern = <T,>(bank: T[]): T | null => {
  if (bank.length === 0) return null;
  return bank[Math.floor(Math.random() * bank.length)];
};

/**
 * Build a guitar-style chord voicing — 5–6 notes spread across ~2 octaves
 * to mimic a real open/barre chord on 6 strings. `chord.midi` alone is only
 * 3 notes (bare triad in octave 3), which sounds like an arpeggio when
 * "strummed" with a small stagger. This spreads it properly.
 *
 * Layout (low → high):
 *   [ root-12 (oct 2), fifth-12 (oct 2), root (oct 3), third (oct 3),
 *     fifth (oct 3), root+12 (oct 4) ]
 *
 * This mirrors a real open C or G chord shape — low root, fifth, octave
 * root, third, fifth, high root. Sounds like a guitar when strummed.
 */
export const buildGuitarVoicing = (chord: JamChord): number[] => {
  const [root, third, fifth] = chord.midi;
  if (root == null) return [];
  const voicing: number[] = [];
  voicing.push(root - 12);                     // low root (oct 2)
  if (fifth != null) voicing.push(fifth - 12); // low fifth
  voicing.push(root);                          // octave root (oct 3)
  if (third != null) voicing.push(third);
  if (fifth != null) voicing.push(fifth);
  voicing.push(root + 12);                     // high root (oct 4)
  return voicing;
};

/** Build an array of { midi, delay } pairs for a strum hit.
 *  Accepts a pre-built voicing so callers can pass a guitar-shaped
 *  voicing instead of the bare triad in `chord.midi`.
 *  delay is in seconds — feed to audioTime + delay for each note. */
export const strumMidis = (
  voicing: number[],
  direction: 'down' | 'up',
  noteCount: number,
): { midi: number; delay: number }[] => {
  let notes = [...voicing];
  if (noteCount > 0 && noteCount < notes.length) {
    // Take the lowest N for down, highest N for up
    notes = direction === 'down'
      ? notes.slice(0, noteCount)
      : notes.slice(-noteCount);
  }
  if (direction === 'up') notes.reverse();
  const strumDelay = 0.022; // 22ms between each string — natural strum speed
  return notes.map((midi, i) => ({ midi, delay: i * strumDelay }));
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
