export const notes = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

export const getChromaticScale = (rootNote: string): string[] => {
  const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const chromaticScaleFlats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  let rootIndex = chromaticScale.indexOf(rootNote);
  const useFlats = rootIndex === -1;
  
  if (useFlats) {
    rootIndex = chromaticScaleFlats.indexOf(rootNote);
    if (rootIndex === -1) return notes; // fallback if root note not found
    
    // Return chromatic scale starting from root using flats
    const reordered = [];
    for (let i = 0; i < 12; i++) {
      reordered.push(chromaticScaleFlats[(rootIndex + i) % 12]);
    }
    return reordered;
  } else {
    // Return chromatic scale starting from root using sharps
    const reordered = [];
    for (let i = 0; i < 12; i++) {
      reordered.push(chromaticScale[(rootIndex + i) % 12]);
    }
    return reordered;
  }
};

export const scales = {
  // Pentatonic Scales
  'Major Pentatonic': {
    intervals: [0, 2, 4, 7, 9],
    description: '1 - 2 - 3 - 5 - 6'
  },
  'Minor Pentatonic': {
    intervals: [0, 3, 5, 7, 10],
    description: '1 - ♭3 - 4 - 5 - ♭7'
  },

  // Major Scales and Modes
  'Major (Ionian)': {
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: '1 - 2 - 3 - 4 - 5 - 6 - 7'
  },
  'Dorian': {
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: '1 - 2 - ♭3 - 4 - 5 - 6 - ♭7'
  },
  'Phrygian': {
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: '1 - ♭2 - ♭3 - 4 - 5 - ♭6 - ♭7'
  },
  'Lydian': {
    intervals: [0, 2, 4, 6, 7, 9, 11],
    description: '1 - 2 - 3 - ♯4 - 5 - 6 - 7'
  },
  'Mixolydian': {
    intervals: [0, 2, 4, 5, 7, 9, 10],
    description: '1 - 2 - 3 - 4 - 5 - 6 - ♭7'
  },
  'Aeolian (Natural Minor)': {
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: '1 - 2 - ♭3 - 4 - 5 - ♭6 - ♭7'
  },
  'Locrian': {
    intervals: [0, 1, 3, 5, 6, 8, 10],
    description: '1 - ♭2 - ♭3 - 4 - ♭5 - ♭6 - ♭7'
  },

  // Harmonic Minor
  'Harmonic Minor': {
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: '1 - 2 - ♭3 - 4 - 5 - ♭6 - 7'
  }
};
// Helper function to determine if a key uses sharps or flats
const getAccidentalType = (rootNote: string): 'sharp' | 'flat' | 'natural' => {
  const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
  
  if (sharpKeys.includes(rootNote)) return 'sharp';
  if (flatKeys.includes(rootNote)) return 'flat';
  return 'natural';
};

// Helper function to get the next letter in the musical alphabet
const getNextLetter = (letter: string): string => {
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const index = letters.indexOf(letter);
  return letters[(index + 1) % 7];
};

// Helper function to get the letter name from a note (removes accidentals)
const getNoteLetter = (note: string): string => {
  return note[0];
};


export const getScaleNotes = (rootNote: string, scaleType: keyof typeof scales): string[] => {
  const scale = scales[scaleType];
  if (!scale || !scale.intervals) return [];
  
  const accidentalType = getAccidentalType(rootNote);
  
  // Find the chromatic position of the root note
  const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const chromaticScaleFlats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  let rootIndex = chromaticScale.indexOf(rootNote);
  if (rootIndex === -1) {
    rootIndex = chromaticScaleFlats.indexOf(rootNote);
  }
  
  // Special handling for pentatonic scales - use simple chromatic selection
  if (scaleType.includes('Pentatonic')) {
    const useFlats = accidentalType === 'flat';
    const chromaticRef = useFlats ? chromaticScaleFlats : chromaticScale;
    
    return scale.intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return chromaticRef[noteIndex];
    });
  }
  
  // For diatonic scales (7-note scales), use alphabetical spelling
  const result: string[] = [rootNote];
  let currentLetter = getNoteLetter(rootNote);
  
  // Build the scale note by note
  for (let i = 1; i < scale.intervals.length; i++) {
    const targetChromaticPosition = (rootIndex + scale.intervals[i]) % 12;
    currentLetter = getNextLetter(currentLetter);
    
    // Find the correct spelling for this chromatic position using the current letter
    const useFlats = accidentalType === 'flat';
    const chromaticRef = useFlats ? chromaticScaleFlats : chromaticScale;
    
    // Look for the note at the target position that uses the current letter
    let foundNote = chromaticRef[targetChromaticPosition];
    
    // If the found note doesn't use the correct letter, we need to respell it
    if (getNoteLetter(foundNote) !== currentLetter) {
      // Create the correct spelling
      const letterMap: { [key: string]: number } = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
      const basicPosition = letterMap[currentLetter];
      let semitoneOffset = (targetChromaticPosition - basicPosition + 12) % 12;
      
      // Convert offset > 6 to negative equivalent (shorter path around circle)
      if (semitoneOffset > 6) {
        semitoneOffset = semitoneOffset - 12;
      }
      
      if (semitoneOffset === 1) {
        foundNote = currentLetter + '#';
      } else if (semitoneOffset === -1) {
        foundNote = currentLetter + 'b';
      } else if (semitoneOffset === 0) {
        foundNote = currentLetter;
      } else if (semitoneOffset === 2) {
        foundNote = currentLetter + '##'; // Double sharp (rare)
      } else if (semitoneOffset === -2) {
        foundNote = currentLetter + 'bb'; // Double flat (rare)
      } else {
        // For large offsets, use the chromatic scale note as-is
        foundNote = chromaticRef[targetChromaticPosition];
      }
    }
    
    result.push(foundNote);
  }
  
  return result;
};

export const chordTypes = {
  'major': { intervals: [0, 4, 7], symbol: '' },
  'minor': { intervals: [0, 3, 7], symbol: 'm' },
  'diminished': { intervals: [0, 3, 6], symbol: '°' },
  'augmented': { intervals: [0, 4, 8], symbol: '+' },
  'major7': { intervals: [0, 4, 7, 11], symbol: 'maj7' },
  'minor7': { intervals: [0, 3, 7, 10], symbol: 'm7' },
  'dominant7': { intervals: [0, 4, 7, 10], symbol: '7' },
  'diminished7': { intervals: [0, 3, 6, 9], symbol: '°7' },
  'half-diminished7': { intervals: [0, 3, 6, 10], symbol: 'ø7' },
};

export const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Simple major and minor chord progressions
export const majorProgressions = {
  // Classic and Traditional
  'I - IV - V': { chords: ['I', 'IV', 'V'], quality: 'Bright, triumphant, fundamental rock/folk foundation' },
  'I - V - vi - IV': { chords: ['I', 'V', 'vi', 'IV'], quality: 'Anthemic, emotional, modern pop staple' },
  'I - vi - IV - V': { chords: ['I', 'vi', 'IV', 'V'], quality: 'Classic 50s progression, nostalgic, doo-wop' },
  'ii - V - I': { chords: ['ii', 'V', 'I'], quality: 'Sophisticated jazz cadence, smooth resolution' },
  
  // Pop and Rock
  'vi - IV - I - V': { chords: ['vi', 'IV', 'I', 'V'], quality: 'Modern alternative, bittersweet, introspective' },
  'I - iii - IV - V': { chords: ['I', 'iii', 'IV', 'V'], quality: 'Uplifting, slightly melancholic, Beatles-esque' },
  'I - IV - vi - V': { chords: ['I', 'IV', 'vi', 'V'], quality: 'Versatile pop progression, balanced emotions' },
  'I - bVII - IV': { chords: ['I', 'bVII', 'IV'], quality: 'Rock power progression, Mixolydian flavor' },
  'I - V - IV': { chords: ['I', 'V', 'IV'], quality: 'Simple rock progression, direct and powerful' },
  'I - vi - II - V': { chords: ['I', 'vi', 'II', 'V'], quality: 'Sophisticated pop, secondary dominant tension' },
  'I - III - vi - IV': { chords: ['I', 'III', 'vi', 'IV'], quality: 'Dramatic, unexpected major III creates tension' },
  
  // Blues and Country
  '12-Bar Blues': { chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], quality: 'Classic blues structure, soulful and gritty' },
  'Simple Blues': { chords: ['I7', 'IV7', 'V7'], quality: 'Basic blues turnaround, raw and authentic' },
  '8-Bar Blues': { chords: ['I7', 'V7', 'IV7', 'IV7', 'I7', 'V7', 'I7', 'V7'], quality: 'Compact blues form, punchy and direct' },
  'Country': { chords: ['I', 'IV', 'I', 'V'], quality: 'Traditional country/folk, simple and honest' },
  'Country Waltz': { chords: ['I', 'IV', 'I', 'V7'], quality: 'Classic country waltz, gentle and flowing' },
  'Outlaw Country': { chords: ['I', 'bVII', 'IV', 'I'], quality: 'Rebellious country rock, edgy and defiant' },
  
  // Jazz
  'Jazz ii-V-I': { chords: ['ii7', 'V7', 'Imaj7'], quality: 'Essential jazz cadence, sophisticated and smooth' },
  'Jazz Turnaround': { chords: ['Imaj7', 'VI7', 'ii7', 'V7'], quality: 'Classic jazz ending, creates circular motion' },
  'Rhythm Changes A': { chords: ['Imaj7', 'vi7', 'ii7', 'V7'], quality: 'Jazz standard progression, bebop essential' },
  'Modal Jazz': { chords: ['Imaj7', 'IVmaj7'], quality: 'Open modal sound, spacious and contemplative' },
  'Jazz Blues': { chords: ['I7', 'IV7', 'I7', 'I7', 'IV7', '#IV°7', 'I7', 'VI7', 'ii7', 'V7', 'I7', 'V7'], quality: 'Sophisticated blues with jazz substitutions' },
  
  // Folk and Acoustic
  'Folk I-V': { chords: ['I', 'V', 'I', 'V'], quality: 'Simple folk pattern, storytelling foundation' },
  'Celtic': { chords: ['I', 'bVII', 'I', 'V'], quality: 'Traditional Celtic sound, mystical and ancient' },
  'Campfire': { chords: ['I', 'vi', 'IV', 'I'], quality: 'Warm acoustic progression, intimate and friendly' },
  
  // Gospel and Soul
  'Gospel': { chords: ['I', 'IV', 'I/V', 'V'], quality: 'Traditional gospel, uplifting and spiritual' },
  'Soul': { chords: ['Imaj7', 'IIImaj7', 'vi7', 'IVmaj7'], quality: 'Smooth soul progression, rich and emotional' },
  'Neo-Soul': { chords: ['Imaj9', 'vi9', 'ii9', 'V13'], quality: 'Modern soul sound, complex and sophisticated' },
  
  // Progressive and Alternative
  'Progressive': { chords: ['I', 'bII', 'IV', 'V'], quality: 'Unexpected chromatic movement, avant-garde' },
  'Dream Pop': { chords: ['Imaj7', 'IVmaj7', 'vi7', 'IVmaj7'], quality: 'Ethereal and floating, atmospheric' },
  'Math Rock': { chords: ['I', 'III', 'bVI', 'IV'], quality: 'Angular and unexpected, intellectually engaging' },
};

export const minorProgressions = {
  // Classic Minor
  'i - iv - V': { chords: ['i', 'iv', 'V'], quality: 'Traditional minor, dramatic tension and resolution' },
  'i - bVI - bVII': { chords: ['i', 'bVI', 'bVII'], quality: 'Epic rock progression, powerful and driving' },
  'i - bVII - IV': { chords: ['i', 'bVII', 'IV'], quality: 'Dorian rock sound, hopeful darkness' },
  'i - iv - i - V': { chords: ['i', 'iv', 'i', 'V'], quality: 'Classic minor turnaround, melancholic journey' },
  'i - v - i': { chords: ['i', 'v', 'i'], quality: 'Dark and brooding, medieval quality' },
  
  // Pop and Alternative Minor
  'vi - IV - I - V': { chords: ['vi', 'IV', 'I', 'V'], quality: 'Relative major movement, bittersweet pop' },
  'i - III - bVII - IV': { chords: ['i', 'III', 'bVII', 'IV'], quality: 'Modern alternative, emotionally complex' },
  'i - bVI - III - bVII': { chords: ['i', 'bVI', 'III', 'bVII'], quality: 'Cinematic and grand, film score quality' },
  'i - v - bVI - IV': { chords: ['i', 'v', 'bVI', 'IV'], quality: 'Introspective indie, contemplative mood' },
  
  // Blues and Soul Minor
  'Minor Blues': { chords: ['i7', 'iv7', 'V7'], quality: 'Classic minor blues, raw and emotional' },
  '12-Bar Minor Blues': { chords: ['i7', 'i7', 'i7', 'i7', 'iv7', 'iv7', 'i7', 'i7', 'V7', 'iv7', 'i7', 'V7'], quality: 'Extended minor blues, deep and soulful' },
  'Soul Minor': { chords: ['i7', 'iv7', 'bVII7', 'III7'], quality: 'Smooth minor soul, sophisticated sadness' },
  
  // Emotional and Dramatic
  'Sad Progression': { chords: ['i', 'bVI', 'iv', 'V'], quality: 'Deeply melancholic, tearjerker progression' },
  'Heartbreak': { chords: ['i', 'v', 'i', 'iv'], quality: 'Sorrowful and resigned, emotional weight' },
  'Lament': { chords: ['i', 'bVII', 'bVI', 'v'], quality: 'Descending sadness, baroque-inspired grief' },
  'Tragic': { chords: ['i', 'iv', 'v', 'i'], quality: 'Dark classical progression, inevitable sorrow' },
  
  // Modal Minor
  'Dorian': { chords: ['i', 'IV'], quality: 'Modal brightness in minor, Celtic/folk feel' },
  'Phrygian': { chords: ['i', 'bII', 'i', 'bvii'], quality: 'Spanish/Middle Eastern flavor, exotic darkness' },
  'Aeolian Classic': { chords: ['i', 'bVI', 'bVII', 'i'], quality: 'Natural minor movement, ancient and timeless' },
  
  // Rock and Metal
  'Rock Minor': { chords: ['i', 'bVII', 'IV'], quality: 'Hard rock staple, aggressive yet melodic' },
  'Metal Riff': { chords: ['i', 'bII', 'i', 'bVI'], quality: 'Heavy metal darkness, chromatic tension' },
  'Grunge': { chords: ['i', 'bIII', 'bVI', 'bVII'], quality: 'Alternative rock angst, raw emotion' },
  'Progressive Metal': { chords: ['i', 'bII', 'III', 'v'], quality: 'Complex and dark, technically sophisticated' },
  
  // Jazz Minor
  'Jazz Minor ii-V': { chords: ['ii°', 'V7', 'i'], quality: 'Jazz minor cadence, sophisticated resolution' },
  'Minor Jazz Blues': { chords: ['i6', 'iv7', 'i6', 'i6', 'iv7', 'iv7', 'i6', 'VI7', 'ii°7', 'V7', 'i6', 'V7'], quality: 'Jazz interpretation of minor blues' },
  'Modal Minor Jazz': { chords: ['i7', 'bIImaj7', 'i7', 'bIImaj7'], quality: 'Dark modal jazz, mysterious and floating' },
  
  // World and Folk
  'Andalusian': { chords: ['i', 'bVII', 'bVI', 'V'], quality: 'Flamenco progression, passionate and fiery' },
  'Celtic Minor': { chords: ['i', 'bVII', 'i', 'v'], quality: 'Traditional Celtic sadness, haunting beauty' },
  'Eastern European': { chords: ['i', 'iv', 'V', 'i'], quality: 'Gypsy/Klezmer feel, dancing through tears' },
  'Middle Eastern': { chords: ['i', 'bII', 'v', 'i'], quality: 'Exotic scales, mysterious and ancient' },
  
  // Electronic and Modern
  'Dark Electronic': { chords: ['i', 'i', 'bVI', 'V'], quality: 'Synth-based darkness, modern production' },
  'Trap Minor': { chords: ['i', 'bVI', 'bIII', 'bVII'], quality: 'Modern hip-hop minor, atmospheric and moody' },
  'Ambient Minor': { chords: ['i7', 'iv7', 'bVII7', 'i7'], quality: 'Floating and ethereal, spacious soundscape' },
};

// Scale suggestions for major vs minor
// Musical styles for backing tracks
export const musicalStyles = [
  'Rock',
  'Blues',
  'Jazz',
  'Pop',
  'Country',
  'Folk',
  'Funk',
  'R&B',
  'Soul',
  'Metal',
  'Punk',
  'Alternative',
  'Indie',
  'Acoustic',
  'Ballad',
  'Latin',
  'Reggae',
  'Electronic',
  'Ambient'
];

// Card templates for different practice scenarios
export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  cards: {
    practiceProgress: boolean;
    metronome: boolean;
    noteSelector: boolean;
    timer: boolean;
    chordProgression: boolean;
    guitarNeck: boolean;
  };
}

export const cardTemplates: CardTemplate[] = [
  {
    id: 'all',
    name: 'All Cards',
    description: 'All available cards enabled',
    cards: {
      practiceProgress: true,
      metronome: true,
      noteSelector: true,
      timer: true,
      chordProgression: true,
      guitarNeck: true,
    }
  },
  {
    id: 'practice',
    name: 'Practice',
    description: 'Essential practice tools',
    cards: {
      practiceProgress: true,
      metronome: true,
      noteSelector: false,
      timer: true,
      chordProgression: false,
      guitarNeck: false,
    }
  },
  {
    id: 'theory',
    name: 'Theory',
    description: 'Scale and chord theory tools',
    cards: {
      practiceProgress: false,
      metronome: false,
      noteSelector: true,
      timer: false,
      chordProgression: true,
      guitarNeck: true,
    }
  }
];

// Harmony interval presets for diatonic harmony generation
export const harmonyPresets: { [key: string]: { scaleDegreeOffset: number; label: string } } = {
  'Diatonic 3rd': { scaleDegreeOffset: 2, label: '3rd' },
  'Diatonic 4th': { scaleDegreeOffset: 3, label: '4th' },
  'Diatonic 5th': { scaleDegreeOffset: 4, label: '5th' },
  'Diatonic 6th': { scaleDegreeOffset: 5, label: '6th' },
  'Diatonic 7th': { scaleDegreeOffset: 6, label: '7th' },
  'Octave': { scaleDegreeOffset: 7, label: 'Oct' },
};

// ---------------------------------------------------------------------------
// Interval specification for the Harmony Maker
// ---------------------------------------------------------------------------
// A harmony interval is either:
//  - Diatonic: "N scale degrees above the base" — meaning depends on the key
//  - Chromatic: "N semitones above the base" — fixed regardless of key
// This discriminated union lets a single picker surface both.

export type IntervalSpec =
  | { kind: 'diatonic'; degrees: number }     // 2 → 3rd, 4 → 5th, 7 → octave
  | { kind: 'chromatic'; semitones: number }; // 0–12 semitones

// Diatonic options exposed as the top-bar quick-select chips.
export const diatonicIntervalOptions: { spec: IntervalSpec; label: string }[] = [
  { spec: { kind: 'diatonic', degrees: 2 }, label: '3rd' },
  { spec: { kind: 'diatonic', degrees: 3 }, label: '4th' },
  { spec: { kind: 'diatonic', degrees: 4 }, label: '5th' },
  { spec: { kind: 'diatonic', degrees: 5 }, label: '6th' },
  { spec: { kind: 'diatonic', degrees: 6 }, label: '7th' },
  { spec: { kind: 'diatonic', degrees: 7 }, label: 'Oct' },
];

// Chromatic options — surfaced only in the per-note dropdown. Globally applying
// e.g. a tritone to every note is rare, so these are intentionally out of the
// top-bar chips.
export const chromaticIntervalOptions: { spec: IntervalSpec; label: string }[] = [
  { spec: { kind: 'chromatic', semitones: 0 },  label: 'Unison' },
  { spec: { kind: 'chromatic', semitones: 1 },  label: 'm2' },
  { spec: { kind: 'chromatic', semitones: 2 },  label: 'M2' },
  { spec: { kind: 'chromatic', semitones: 3 },  label: 'm3' },
  { spec: { kind: 'chromatic', semitones: 4 },  label: 'M3' },
  { spec: { kind: 'chromatic', semitones: 5 },  label: 'P4' },
  { spec: { kind: 'chromatic', semitones: 6 },  label: 'Tritone' },
  { spec: { kind: 'chromatic', semitones: 7 },  label: 'P5' },
  { spec: { kind: 'chromatic', semitones: 8 },  label: 'm6' },
  { spec: { kind: 'chromatic', semitones: 9 },  label: 'M6' },
  { spec: { kind: 'chromatic', semitones: 10 }, label: 'm7' },
  { spec: { kind: 'chromatic', semitones: 11 }, label: 'M7' },
  { spec: { kind: 'chromatic', semitones: 12 }, label: 'Octave' },
];

// Stable string key for a spec — used as <select> option values and to
// compare two specs for equality (e.g. "is this note at the default?").
export const intervalSpecKey = (spec: IntervalSpec): string =>
  spec.kind === 'diatonic' ? `d:${spec.degrees}` : `c:${spec.semitones}`;

export const intervalSpecsEqual = (a: IntervalSpec, b: IntervalSpec): boolean =>
  intervalSpecKey(a) === intervalSpecKey(b);

// Parse an option value back into a spec (inverse of intervalSpecKey).
export const parseIntervalSpecKey = (key: string): IntervalSpec | null => {
  const [kind, n] = key.split(':');
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  if (kind === 'd') return { kind: 'diatonic', degrees: num };
  if (kind === 'c') return { kind: 'chromatic', semitones: num };
  return null;
};

// Resolve any IntervalSpec against the current scale context to produce a
// target note. Returns `diatonic: false` when the result is outside the scale
// (either because the spec is chromatic, or because the diatonic fallback had
// to go off-scale to find a note for a non-scale base).
export const resolveInterval = (
  baseNote: string,
  rootNote: string,
  scaleType: keyof typeof scales,
  spec: IntervalSpec
): { note: string; diatonic: boolean } | null => {
  if (spec.kind === 'diatonic') {
    return getHarmonyNoteWithFallback(baseNote, rootNote, scaleType, spec.degrees);
  }

  // Chromatic: fixed semitone distance, spelled using the root's chromatic scale.
  const basePos = getChromaticPosition(baseNote);
  const targetPos = (basePos + spec.semitones) % 12;
  const chromatic = getChromaticScale(rootNote);
  const targetNote = chromatic.find(n => getChromaticPosition(n) === targetPos);
  if (!targetNote) return null;

  // Mark diatonic only if the resolved note happens to land in the scale.
  const scaleNotes = getScaleNotes(rootNote, scaleType);
  const inScale = scaleNotes.some(n => getChromaticPosition(n) === targetPos);
  return { note: targetNote, diatonic: inScale };
};

// Chromatic position map (exported for use by other modules)
export const getChromaticPosition = (noteName: string): number => {
  const chromaticMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  return chromaticMap[noteName] ?? 0;
};

// Full interval names by semitone distance
export const intervalNames: { [key: number]: string } = {
  0: 'Perfect Unison',
  1: 'Minor 2nd',
  2: 'Major 2nd',
  3: 'Minor 3rd',
  4: 'Major 3rd',
  5: 'Perfect 4th',
  6: 'Tritone',
  7: 'Perfect 5th',
  8: 'Minor 6th',
  9: 'Major 6th',
  10: 'Minor 7th',
  11: 'Major 7th',
};

// Get diatonic harmony note for a given base note within a scale
export const getHarmonyNote = (
  baseNote: string,
  rootNote: string,
  scaleType: keyof typeof scales,
  scaleDegreeOffset: number
): string | null => {
  const scaleNotes = getScaleNotes(rootNote, scaleType);
  if (scaleNotes.length === 0) return null;

  // Find the base note's index in the scale (enharmonic aware)
  const basePos = getChromaticPosition(baseNote);
  const scaleIndex = scaleNotes.findIndex(n => getChromaticPosition(n) === basePos);
  if (scaleIndex === -1) return null;

  const harmonyIndex = (scaleIndex + scaleDegreeOffset) % scaleNotes.length;
  return scaleNotes[harmonyIndex];
};

// Get harmony note with chromatic fallback for non-diatonic base notes.
// Returns the harmony note and whether the base note was in the scale.
export const getHarmonyNoteWithFallback = (
  baseNote: string,
  rootNote: string,
  scaleType: keyof typeof scales,
  scaleDegreeOffset: number
): { note: string; diatonic: boolean } | null => {
  // Try diatonic first
  const diatonic = getHarmonyNote(baseNote, rootNote, scaleType, scaleDegreeOffset);
  if (diatonic) return { note: diatonic, diatonic: true };

  // Non-diatonic fallback: find the nearest scale tone below the base note,
  // compute its diatonic interval in semitones, then apply the same chromatic
  // distance to the actual base note.
  const scaleNotes = getScaleNotes(rootNote, scaleType);
  if (scaleNotes.length === 0) return null;

  const basePos = getChromaticPosition(baseNote);

  // Find the nearest scale tone (smallest ascending distance from a scale note to baseNote)
  let nearestIdx = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < scaleNotes.length; i++) {
    const dist = (basePos - getChromaticPosition(scaleNotes[i]) + 12) % 12;
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIdx = i;
    }
  }

  // Compute semitone distance for that scale tone's diatonic interval
  const nearestPos = getChromaticPosition(scaleNotes[nearestIdx]);
  const harmonyIdx = (nearestIdx + scaleDegreeOffset) % scaleNotes.length;
  const nearestHarmonyPos = getChromaticPosition(scaleNotes[harmonyIdx]);
  const semitoneInterval = (nearestHarmonyPos - nearestPos + 12) % 12;

  // Apply the same semitone interval chromatically to the base note
  const targetPos = (basePos + semitoneInterval) % 12;
  const chromatic = getChromaticScale(rootNote);
  const targetNote = chromatic.find(n => getChromaticPosition(n) === targetPos);
  if (!targetNote) return null;

  return { note: targetNote, diatonic: false };
};

export const scaleSuggestions: { [key: string]: 'major' | 'minor' | 'both' } = {
  'Major (Ionian)': 'major',
  'Dorian': 'minor',
  'Phrygian': 'minor',
  'Lydian': 'major',
  'Mixolydian': 'major',
  'Aeolian (Natural Minor)': 'minor',
  'Locrian': 'minor',
  'Major Pentatonic': 'major',
  'Minor Pentatonic': 'minor',
  'Harmonic Minor': 'minor',
};

// Define which scales support traditional chord progressions
export const diatonicScales = [
  'Major (Ionian)',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Aeolian (Natural Minor)',
  'Locrian',
  'Harmonic Minor'
];

// Chord-tone chromatic positions (0–11) for a chord rooted at `root`. Use for
// enharmonic-aware highlighting: compare via getChromaticPosition(fretNote).
export const getChordChromaticPositions = (
  root: string,
  type: keyof typeof chordTypes
): number[] => {
  const rootPos = getChromaticPosition(root);
  return chordTypes[type].intervals.map(i => (rootPos + i) % 12);
};

// Interval-name spellings per chord type, in the same order as chordTypes[t].intervals.
// Lets us render "1 / 3 / ♯5" for augmented, "1 / ♭3 / ♭5 / 𝄫7" for dim7, etc.
export const chordIntervalSpellings: Record<keyof typeof chordTypes, string[]> = {
  major: ['1', '3', '5'],
  minor: ['1', '♭3', '5'],
  diminished: ['1', '♭3', '♭5'],
  augmented: ['1', '3', '♯5'],
  major7: ['1', '3', '5', '7'],
  minor7: ['1', '♭3', '5', '♭7'],
  dominant7: ['1', '3', '5', '♭7'],
  diminished7: ['1', '♭3', '♭5', '𝄫7'],
  'half-diminished7': ['1', '♭3', '♭5', '♭7'],
};

// Resolve a chord-tone's interval label relative to the chord root.
// Returns null if the target isn't a member of the chord.
export const getChordIntervalName = (
  target: string,
  chordRoot: string,
  type: keyof typeof chordTypes
): string | null => {
  const semitones = (getChromaticPosition(target) - getChromaticPosition(chordRoot) + 12) % 12;
  const idx = chordTypes[type].intervals.indexOf(semitones);
  if (idx === -1) return null;
  return chordIntervalSpellings[type][idx] ?? null;
};

// Classify a triad by the semitone intervals from the root to the stacked 3rd and 5th.
// Returns one of the four triad qualities defined in chordTypes.
const classifyTriad = (t3: number, t5: number): keyof typeof chordTypes => {
  if (t3 === 4 && t5 === 7) return 'major';
  if (t3 === 3 && t5 === 7) return 'minor';
  if (t3 === 3 && t5 === 6) return 'diminished';
  if (t3 === 4 && t5 === 8) return 'augmented';
  // Exotic interval stack (e.g. sus-like from non-standard scales): fall back by the 3rd.
  return t3 <= 3 ? 'minor' : 'major';
};

export const getScaleChords = (rootNote: string, scaleType: keyof typeof scales) => {
  // Pentatonic scales don't support tertian stacking directly — swap to the parent
  // diatonic scale so thirds stack through real scale degrees.
  let chordsScaleNotes: string[];
  if (scaleType === 'Major Pentatonic') {
    chordsScaleNotes = getScaleNotes(rootNote, 'Major (Ionian)');
  } else if (scaleType === 'Minor Pentatonic') {
    chordsScaleNotes = getScaleNotes(rootNote, 'Aeolian (Natural Minor)');
  } else {
    chordsScaleNotes = getScaleNotes(rootNote, scaleType);
  }

  const chords: { roman: string; note: string; type: string; symbol: string }[] = [];
  const n = chordsScaleNotes.length;
  if (n === 0) return chords;

  // Build each chord by stacking thirds (scale degrees i, i+2, i+4).
  // The chord quality is derived from the actual semitone intervals, so
  // anything scale-correct stays correct — no hardcoded per-mode lookup.
  for (let i = 0; i < n; i++) {
    const rootNoteInScale = chordsScaleNotes[i];
    const thirdNote = chordsScaleNotes[(i + 2) % n];
    const fifthNote = chordsScaleNotes[(i + 4) % n];

    const rootPos = getChromaticPosition(rootNoteInScale);
    const t3 = (getChromaticPosition(thirdNote) - rootPos + 12) % 12;
    const t5 = (getChromaticPosition(fifthNote) - rootPos + 12) % 12;

    const chordType = classifyTriad(t3, t5);

    let roman = romanNumerals[i] || `${i + 1}`;
    if (chordType === 'diminished') {
      roman = roman.toLowerCase() + '°';
    } else if (chordType === 'augmented') {
      roman = roman.toUpperCase() + '+';
    } else if (chordType === 'minor') {
      roman = roman.toLowerCase();
    }

    chords.push({
      roman,
      note: rootNoteInScale,
      type: chordType,
      symbol: chordTypes[chordType].symbol,
    });
  }

  return chords;
};