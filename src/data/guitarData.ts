// Standard guitar tuning (displayed top to bottom: high E to low E)
export const standardTuning = ['E', 'B', 'G', 'D', 'A', 'E'];

// Chromatic position lookup — accepts both sharp and flat spellings so the
// tuning array can hold either (e.g. Eb tuning spelled 'Eb' or 'D#').
const chromaticPositions: { [key: string]: number } = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const sharpSpelling = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Generate fretboard data up to a given number of frets. Tuning entries may
// be any sharp or flat spelling; fretted note names come out as sharp
// spellings (the fretboard-level rendering just needs enharmonic equivalence).
export const generateFretboard = (tuning: string[] = standardTuning, frets: number = 12) => {
  return tuning.map((openString, stringIndex) => {
    const openNoteIndex = chromaticPositions[openString] ?? 4; // default E if unknown
    const string = [];

    // Open string (fret 0) keeps the caller's spelling so the tuning label
    // displays exactly what the user picked.
    string.push({
      fret: 0,
      note: openString,
      stringIndex,
      isOpen: true,
    });

    for (let fret = 1; fret <= frets; fret++) {
      const noteIndex = (openNoteIndex + fret) % 12;
      string.push({
        fret,
        note: sharpSpelling[noteIndex],
        stringIndex,
        isOpen: false,
      });
    }

    return string;
  });
};

// Get notes for a specific fret across all strings
export const getNotesAtFret = (fretboard: any[][], fret: number) => {
  return fretboard.map(string => string[fret]);
};

// Helper function to get chromatic position of a note
const getChromaticPosition = (noteName: string): number => {
  const chromaticMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  return chromaticMap[noteName] ?? 0;
};

// Check if a note is in a given scale (enharmonic aware)
export const isNoteInScale = (note: string, scaleNotes: string[]) => {
  // First try direct match
  if (scaleNotes.includes(note)) {
    return true;
  }
  
  // Then try enharmonic match
  const noteChromaticPos = getChromaticPosition(note);
  return scaleNotes.some(scaleNote => getChromaticPosition(scaleNote) === noteChromaticPos);
};

// Get fret markers (standard guitar fret markers)
export const fretMarkers = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
export const doubleFretMarkers = [12, 24];