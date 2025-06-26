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