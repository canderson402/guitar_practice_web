import React from 'react';
import { useStore } from '../store/useStore';
import {
  notes,
  getScaleNotes,
  scales,
  getChromaticScale,
  chordTypes,
  getChordChromaticPositions,
  getChordIntervalName,
} from '../data/musicData';
import { generateFretboard, fretMarkers, doubleFretMarkers, isNoteInScale } from '../data/guitarData';
import './GuitarNeckNew.css';

export const GuitarNeck: React.FC = () => {
  const { note, setSelectedScale } = useStore();
  const [show24Frets, setShow24Frets] = React.useState(false);
  const [showRoot, setShowRoot] = React.useState(true);
  const [showScale, setShowScale] = React.useState(true);
  const [showCurrent, setShowCurrent] = React.useState(true);
  const [whiteText, setWhiteText] = React.useState(true);
  const [showIntervals, setShowIntervals] = React.useState(false);
  
  // Validate selected scale and reset if invalid
  React.useEffect(() => {
    if (note.selectedScale && !scales[note.selectedScale as keyof typeof scales]) {
      setSelectedScale('Major (Ionian)');
    }
  }, [note.selectedScale, setSelectedScale]);
  
  // Generate the fretboard data
  const fretboard = generateFretboard(undefined, show24Frets ? 24 : 15);

  // Get current scale notes
  const currentNotes = note.selectedScale && note.selectedNote
    ? getScaleNotes(note.selectedNote, note.selectedScale as keyof typeof import('../data/musicData').scales)
    : note.selectedNote
    ? getChromaticScale(note.selectedNote) // Use reordered chromatic scale starting from root
    : notes; // Show all notes by default

  // Chord-focus mode: when a chord is selected from the chord card, only the
  // chord tones light up on the fretboard and the chord root takes over as the
  // "root" highlight. Deselecting falls back to plain scale display.
  const selectedChord = note.selectedChord;
  const chordType = selectedChord
    ? (selectedChord.type as keyof typeof chordTypes)
    : null;
  const chordPositions = selectedChord && chordType
    ? getChordChromaticPositions(selectedChord.note, chordType)
    : null;
  
  // Get current note being highlighted
  const currentHighlightNote = currentNotes.length > 0 
    ? currentNotes[Math.min(note.currentNoteIndex, currentNotes.length - 1)]
    : null;

  // Helper function to get chromatic position of a note
  const getChromaticPosition = (noteName: string): number => {
    const chromaticMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return chromaticMap[noteName] ?? 0;
  };

  // Helper function to check if two notes are enharmonically equivalent
  const areNotesEquivalent = (note1: string, note2: string): boolean => {
    return getChromaticPosition(note1) === getChromaticPosition(note2);
  };

  // Get interval information for any note relative to root
  const getInterval = (targetNote: string) => {
    if (!note.selectedNote) {
      return null;
    }
    
    // Always use chromatic distance calculation for consistent interval naming
    const rootChromaticPos = getChromaticPosition(note.selectedNote);
    const targetChromaticPos = getChromaticPosition(targetNote);
    const interval = (targetChromaticPos - rootChromaticPos + 12) % 12;
    
    const chromaticIntervals = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
    
    // If we have a selected scale, check if this note is in the scale and use scale-specific intervals
    if (note.selectedScale) {
      const targetIndex = currentNotes.findIndex(n => areNotesEquivalent(n, targetNote));
      if (targetIndex !== -1) {
        const scale = scales[note.selectedScale as keyof typeof scales];
        if (scale && scale.description) {
          const intervalNames = scale.description.split(' - ');
          return intervalNames[targetIndex] || chromaticIntervals[interval];
        }
      }
    }
    
    // For chromatic or notes not in scale, use chromatic intervals
    return chromaticIntervals[interval];
  };

  // Get interval for the current highlighted note based on scale position
  const getCurrentScaleInterval = () => {
    if (!note.selectedNote || !currentNotes.length) {
      return null;
    }
    
    const currentIndex = Math.min(note.currentNoteIndex, currentNotes.length - 1);
    const currentHighlightedNote = currentNotes[currentIndex];
    
    // If we have a scale selected, use scale positions for interval names
    if (note.selectedScale) {
      const scale = scales[note.selectedScale as keyof typeof scales];
      if (scale && scale.description) {
        const intervalNames = scale.description.split(' - ');
        return intervalNames[currentIndex] || `${currentIndex + 1}`;
      }
    }
    
    // For chromatic (no selected scale), use chromatic distance calculation for consistency
    if (!note.selectedScale && currentHighlightedNote) {
      const rootChromaticPos = getChromaticPosition(note.selectedNote);
      const currentChromaticPos = getChromaticPosition(currentHighlightedNote);
      const interval = (currentChromaticPos - rootChromaticPos + 12) % 12;
      
      const chromaticIntervals = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
      return chromaticIntervals[interval];
    }
    
    // Fallback for other scales
    return `${currentIndex + 1}`;
  };

  // Get interval information for current note
  const getCurrentInterval = () => {
    return getCurrentScaleInterval();
  };

  const currentInterval = getCurrentInterval();
  
  const renderFret = (fret: number) => {
    const isMarkedFret = fretMarkers.includes(fret);
    const isDoubleDot = doubleFretMarkers.includes(fret);
    
    return (
      <div key={fret} className={`fret ${fret === 0 ? 'nut' : ''}`}>
        {/* Fret number */}
        <div className="fret-number">{fret}</div>
        
        {/* Fret markers */}
        {isMarkedFret && fret > 0 && (
          <div className="fret-marker">
            <div className={`marker-dot ${isDoubleDot ? 'double' : ''}`} />
            {isDoubleDot && <div className="marker-dot double" />}
          </div>
        )}
        
        {/* Strings and notes */}
        <div className="strings">
          {fretboard.map((string, stringIndex) => {
            const fretNote = string[fret];
            if (!fretNote) return null; // Safety check

            const fretChromatic = getChromaticPosition(fretNote.note);

            // In chord-focus mode, "in-scale" means "in-chord" and the chord
            // root replaces the scale root for highlighting purposes.
            const isInChord = chordPositions ? chordPositions.includes(fretChromatic) : false;
            const isInScale = chordPositions
              ? isInChord
              : currentNotes.length > 0 && isNoteInScale(fretNote.note, currentNotes);

            // The "current" scale-interval overlay is a scale-cycler feature
            // and doesn't map cleanly onto chord tones (chord intervals are
            // relative to the chord root, not the scale). Suppress it entirely
            // in chord-focus mode; the control is greyed out to match.
            const isCurrentNote = !chordPositions
              && currentHighlightNote
              && areNotesEquivalent(fretNote.note, currentHighlightNote);

            const rootRef = selectedChord ? selectedChord.note : note.selectedNote;
            const isRootNote = rootRef && areNotesEquivalent(fretNote.note, rootRef);

            // Determine which note types should be shown
            const shouldShowNote = (isRootNote && showRoot) ||
                                  (isInScale && showScale) ||
                                  (isCurrentNote && showCurrent);

            // Label: chord-tone interval when focused on a chord, otherwise scale interval
            const intervalLabel = chordPositions && chordType && selectedChord
              ? getChordIntervalName(fretNote.note, selectedChord.note, chordType)
              : getInterval(fretNote.note);

            return (
              <div key={stringIndex} className="string-container">
                <div className={`guitar-string string-${stringIndex}`} />
                <div
                  className={`note-position ${shouldShowNote ? 'visible' : ''} ${isCurrentNote && showCurrent ? 'current' : isRootNote && showRoot ? 'root' : isInScale && showScale ? 'in-scale' : ''} ${whiteText ? 'white-text' : 'black-text'}`}
                  title={`${fretNote.note} - String ${6 - stringIndex}, Fret ${fret}`}
                >
                  {shouldShowNote && (
                    <span className="note-label">
                      {showIntervals ? intervalLabel || fretNote.note : fretNote.note}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="guitar-neck">
      <div className={`neck-info ${whiteText ? 'white-text-mode' : 'black-text-mode'}`}>
        <div className="neck-controls">
          <div className="legend-item text-toggle" onClick={() => setWhiteText(!whiteText)}>
            <input 
              type="checkbox" 
              checked={whiteText} 
              onChange={() => setWhiteText(!whiteText)}
            />
            <span>White Text</span>
          </div>
          
          <div className="fret-toggle">
            <label>
              <input
                type="checkbox"
                checked={show24Frets}
                onChange={(e) => setShow24Frets(e.target.checked)}
              />
              Show 24 frets
            </label>
          </div>
          
          <div className="legend-item root-item" onClick={() => setShowRoot(!showRoot)}>
            <input 
              type="checkbox" 
              checked={showRoot} 
              onChange={() => setShowRoot(!showRoot)}
            />
            <span>Root</span>
          </div>
          
          <div className="legend-item scale-item" onClick={() => setShowScale(!showScale)}>
            <input 
              type="checkbox" 
              checked={showScale} 
              onChange={() => setShowScale(!showScale)}
            />
            <span>Scale</span>
          </div>
          
          <div
            className={`legend-item current-item ${selectedChord ? 'disabled' : ''}`}
            onClick={() => { if (!selectedChord) setShowCurrent(!showCurrent); }}
            title={selectedChord ? 'Disabled while a chord is highlighted' : undefined}
          >
            <input
              type="checkbox"
              checked={showCurrent && !selectedChord}
              disabled={!!selectedChord}
              onChange={() => setShowCurrent(!showCurrent)}
            />
            <span>Interval{currentInterval && !selectedChord ? `: ${currentInterval}` : ''}</span>
          </div>

          <div className="legend-item intervals-item" onClick={() => setShowIntervals(!showIntervals)}>
            <input 
              type="checkbox" 
              checked={showIntervals} 
              onChange={() => setShowIntervals(!showIntervals)}
            />
            <span>Show Intervals</span>
          </div>
        </div>
        
        {selectedChord ? (
          <div className="scale-info">
            <span className="scale-name">
              {selectedChord.note}{selectedChord.symbol} ({selectedChord.roman})
            </span>
            <span className="scale-context">
              in {note.selectedNote} {note.selectedScale}
            </span>
          </div>
        ) : note.selectedScale && note.selectedNote ? (
          <div className="scale-info">
            <span className="scale-name">{note.selectedNote} {note.selectedScale}</span>
          </div>
        ) : !note.selectedScale && note.selectedNote ? (
          <div className="scale-info">
            <span className="scale-name">Chromatic</span>
          </div>
        ) : null}
      </div>
      
      <div className={`fretboard ${show24Frets ? 'frets-24' : 'frets-15'}`}>
          <div className="string-labels">
            {['E', 'B', 'G', 'D', 'A', 'E'].map((stringNote, index) => (
              <div key={index} className="string-label">
                {stringNote}
              </div>
            ))}
          </div>
          
          <div className="frets-container">
            {Array.from({ length: (show24Frets ? 25 : 16) }, (_, fret) => renderFret(fret))}
          </div>
        </div>
    </div>
  );
};