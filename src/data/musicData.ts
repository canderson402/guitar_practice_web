export const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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

  // Minor Scale Variations
  'Harmonic Minor': {
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: '1 - 2 - ♭3 - 4 - 5 - ♭6 - 7'
  },
  'Melodic Minor': {
    intervals: [0, 2, 3, 5, 7, 9, 11],
    description: '1 - 2 - ♭3 - 4 - 5 - 6 - 7'
  },

  // Blues Scales
  'Blues': {
    intervals: [0, 3, 5, 6, 7, 10],
    description: '1 - ♭3 - 4 - ♭5 - 5 - ♭7'
  },
  'Major Blues': {
    intervals: [0, 2, 3, 4, 7, 9],
    description: '1 - 2 - ♭3 - 3 - 5 - 6'
  },

  // Chromatic and Whole Tone
  'Chromatic': {
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description: '1 - ♭2 - 2 - ♭3 - 3 - 4 - ♭5 - 5 - ♭6 - 6 - ♭7 - 7'
  },
  'Whole Tone': {
    intervals: [0, 2, 4, 6, 8, 10],
    description: '1 - 2 - 3 - ♯4 - ♯5 - ♯6'
  },

  // Diminished Scales
  'Diminished (Half-Whole)': {
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    description: '1 - ♭2 - ♭3 - 3 - ♯4 - 5 - 6 - ♭7'
  },
  'Diminished (Whole-Half)': {
    intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    description: '1 - 2 - ♭3 - 4 - ♭5 - ♭6 - 6 - 7'
  },

  // Bebop Scales
  'Bebop Dominant': {
    intervals: [0, 2, 4, 5, 7, 9, 10, 11],
    description: '1 - 2 - 3 - 4 - 5 - 6 - ♭7 - 7'
  },
  'Bebop Major': {
    intervals: [0, 2, 4, 5, 7, 8, 9, 11],
    description: '1 - 2 - 3 - 4 - 5 - ♯5 - 6 - 7'
  },

  // Exotic/World Scales
  'Phrygian Dominant': {
    intervals: [0, 1, 4, 5, 7, 8, 10],
    description: '1 - ♭2 - 3 - 4 - 5 - ♭6 - ♭7'
  },
  'Hungarian Minor': {
    intervals: [0, 2, 3, 6, 7, 8, 11],
    description: '1 - 2 - ♭3 - ♯4 - 5 - ♭6 - 7'
  },
  'Gypsy': {
    intervals: [0, 1, 4, 5, 7, 8, 10],
    description: '1 - ♭2 - 3 - 4 - 5 - ♭6 - ♭7'
  },
  'Spanish': {
    intervals: [0, 1, 4, 5, 7, 8, 10],
    description: '1 - ♭2 - 3 - 4 - 5 - ♭6 - ♭7'
  },
  'Japanese': {
    intervals: [0, 1, 5, 7, 8],
    description: '1 - ♭2 - 4 - 5 - ♭6'
  },
  'Arabic': {
    intervals: [0, 1, 4, 5, 7, 8, 11],
    description: '1 - ♭2 - 3 - 4 - 5 - ♭6 - 7'
  },

  // Additional Useful Scales
  'Altered (Super Locrian)': {
    intervals: [0, 1, 3, 4, 6, 8, 10],
    description: '1 - ♭2 - ♭3 - ♭4 - ♭5 - ♭6 - ♭7'
  },
  'Lydian Dominant': {
    intervals: [0, 2, 4, 6, 7, 9, 10],
    description: '1 - 2 - 3 - ♯4 - 5 - 6 - ♭7'
  }
};
export const getScaleNotes = (rootNote: string, scaleType: keyof typeof scales): string[] => {
  const rootIndex = notes.indexOf(rootNote);
  if (rootIndex === -1) return [];
  
  const scale = scales[scaleType];
  return scale.intervals.map(interval => 
    notes[(rootIndex + interval) % 12]
  );
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
  'I - IV - V': ['I', 'IV', 'V'],
  'I - V - vi - IV': ['I', 'V', 'vi', 'IV'],
  'I - vi - IV - V': ['I', 'vi', 'IV', 'V'],
  'ii - V - I': ['ii', 'V', 'I'],
  'vi - IV - I - V': ['vi', 'IV', 'I', 'V'],
  'I - iii - IV - V': ['I', 'iii', 'IV', 'V'],
  'I - IV - vi - V': ['I', 'IV', 'vi', 'V'],
  'I - bVII - IV': ['I', 'bVII', 'IV'],
  '12-Bar Blues': ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
  'Simple Blues': ['I7', 'IV7', 'V7'],
  'Country': ['I', 'IV', 'I', 'V'],
  'Jazz ii-V-I': ['ii7', 'V7', 'Imaj7'],
};

export const minorProgressions = {
  'i - iv - V': ['i', 'iv', 'V'],
  'i - bVI - bVII': ['i', 'bVI', 'bVII'],
  'i - bVII - IV': ['i', 'bVII', 'IV'],
  'i - iv - i - V': ['i', 'iv', 'i', 'V'],
  'i - v - i': ['i', 'v', 'i'],
  'vi - IV - I - V': ['vi', 'IV', 'I', 'V'],
  'Minor Blues': ['i7', 'iv7', 'V7'],
  'Sad Progression': ['i', 'bVI', 'iv', 'V'],
  'Dorian': ['i', 'IV'],
  'Rock Minor': ['i', 'bVII', 'IV'],
  'Jazz Minor ii-V': ['ii°', 'V7', 'i'],
  'Andalusian': ['i', 'bVII', 'bVI', 'V'],
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

export const scaleSuggestions: { [key: string]: 'major' | 'minor' | 'both' } = {
  'Major (Ionian)': 'major',
  'Dorian': 'minor',
  'Phrygian': 'minor',
  'Lydian': 'major',
  'Mixolydian': 'major',
  'Aeolian (Natural Minor)': 'minor',
  'Locrian': 'minor',
  'Harmonic Minor': 'minor',
  'Melodic Minor': 'minor',
  'Major Pentatonic': 'major',
  'Minor Pentatonic': 'both',
  'Blues': 'major',
  'Major Blues': 'major',
  'Chromatic': 'both',
  'Whole Tone': 'major',
  'Diminished (Half-Whole)': 'minor',
  'Diminished (Whole-Half)': 'major',
  'Bebop Dominant': 'major',
  'Bebop Major': 'major',
  'Phrygian Dominant': 'minor',
  'Hungarian Minor': 'minor',
  'Gypsy': 'minor',
  'Spanish': 'minor',
  'Japanese': 'both',
  'Arabic': 'minor',
  'Altered (Super Locrian)': 'minor',
  'Lydian Dominant': 'major',
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
  'Harmonic Minor',
  'Melodic Minor'
];

export const getScaleChords = (rootNote: string, scaleType: keyof typeof scales) => {
  const scaleNotes = getScaleNotes(rootNote, scaleType);
  const chords: { roman: string; note: string; type: string; symbol: string }[] = [];
  
  // Define chord patterns for diatonic scales
  const chordPatterns: { [key: string]: string[] } = {
    'Major (Ionian)': ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
    'Dorian': ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
    'Phrygian': ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
    'Lydian': ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
    'Mixolydian': ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
    'Aeolian (Natural Minor)': ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
    'Locrian': ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor'],
    'Harmonic Minor': ['minor', 'diminished', 'augmented', 'minor', 'major', 'major', 'diminished'],
    'Melodic Minor': ['minor', 'minor', 'augmented', 'major', 'major', 'diminished', 'diminished'],
  };
  
  // For diatonic scales, use specific patterns
  let chordPattern = chordPatterns[scaleType];
  
  // For non-diatonic scales, create simple major chords for each note
  if (!chordPattern) {
    chordPattern = scaleNotes.map(() => 'major');
  }
  
  scaleNotes.forEach((note, index) => {
    const chordType = chordPattern[index] || 'major';
    const isMinor = chordType === 'minor';
    const isDiminished = chordType === 'diminished';
    const isAugmented = chordType === 'augmented';
    
    let roman = romanNumerals[index] || `${index + 1}`;
    if (isDiminished) {
      roman = roman.toLowerCase() + '°';
    } else if (isAugmented) {
      roman = roman.toUpperCase() + '+';
    } else if (isMinor) {
      roman = roman.toLowerCase();
    }
    
    chords.push({
      roman,
      note,
      type: chordType,
      symbol: chordTypes[chordType as keyof typeof chordTypes]?.symbol || ''
    });
  });
  
  return chords;
};