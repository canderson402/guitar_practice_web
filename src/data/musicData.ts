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