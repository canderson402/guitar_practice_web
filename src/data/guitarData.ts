// Standard guitar tuning (displayed top to bottom: high E to low E)
export const standardTuning = ['E', 'B', 'G', 'D', 'A', 'E'];

// Generate fretboard data up to 12th fret
export const generateFretboard = (tuning: string[] = standardTuning, frets: number = 12) => {
  const chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  return tuning.map((openString, stringIndex) => {
    const openNoteIndex = chromaticNotes.indexOf(openString);
    const string = [];
    
    // Add open string (fret 0)
    string.push({
      fret: 0,
      note: openString,
      stringIndex,
      isOpen: true
    });
    
    // Add fretted notes
    for (let fret = 1; fret <= frets; fret++) {
      const noteIndex = (openNoteIndex + fret) % chromaticNotes.length;
      string.push({
        fret,
        note: chromaticNotes[noteIndex],
        stringIndex,
        isOpen: false
      });
    }
    
    return string;
  });
};

// Get notes for a specific fret across all strings
export const getNotesAtFret = (fretboard: any[][], fret: number) => {
  return fretboard.map(string => string[fret]);
};

// Check if a note is in a given scale
export const isNoteInScale = (note: string, scaleNotes: string[]) => {
  return scaleNotes.includes(note);
};

// Get fret markers (standard guitar fret markers)
export const fretMarkers = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
export const doubleFretMarkers = [12, 24];