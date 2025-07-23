import React from 'react';
import { useStore } from '../store/useStore';
import { notes, getScaleNotes, scales } from '../data/musicData';
import { generateFretboard, fretMarkers, doubleFretMarkers, isNoteInScale } from '../data/guitarData';
import './GuitarNeckNew.css';

export const GuitarNeck: React.FC = () => {
  const { note, setSelectedScale } = useStore();
  const [show24Frets, setShow24Frets] = React.useState(false);
  const [showRoot, setShowRoot] = React.useState(true);
  const [showScale, setShowScale] = React.useState(true);
  const [showCurrent, setShowCurrent] = React.useState(true);
  const [whiteText, setWhiteText] = React.useState(true);
  
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
    ? notes // All notes when single note selected
    : notes; // Show all notes by default
  
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

  // Get interval information for current note
  const getCurrentInterval = () => {
    if (!note.selectedNote || !currentHighlightNote) {
      return null;
    }
    
    const rootChromaticPos = getChromaticPosition(note.selectedNote);
    const currentChromaticPos = getChromaticPosition(currentHighlightNote);
    const interval = (currentChromaticPos - rootChromaticPos + 12) % 12;
    
    // Basic interval names for chromatic intervals
    const chromaticIntervals = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
    
    // If we have a scale selected, try to get the scale-specific interval
    if (note.selectedScale) {
      const scale = scales[note.selectedScale as keyof typeof scales];
      if (scale) {
        const scaleIntervalIndex = scale.intervals.indexOf(interval);
        if (scaleIntervalIndex !== -1) {
          const intervalNames = scale.description.split(' - ');
          return intervalNames[scaleIntervalIndex] || chromaticIntervals[interval];
        }
      }
    }
    
    // Fallback to chromatic interval
    return chromaticIntervals[interval];
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
            const isInScale = currentNotes.length > 0 && isNoteInScale(fretNote.note, currentNotes);
            const isCurrentNote = currentHighlightNote && areNotesEquivalent(fretNote.note, currentHighlightNote);
            const isRootNote = note.selectedNote && areNotesEquivalent(fretNote.note, note.selectedNote);
            
            // Determine which note types should be shown
            const shouldShowNote = (isRootNote && showRoot) || 
                                  (isInScale && showScale) || 
                                  (isCurrentNote && showCurrent);
            
            return (
              <div key={stringIndex} className="string-container">
                <div className={`guitar-string string-${stringIndex}`} />
                <div 
                  className={`note-position ${shouldShowNote ? 'visible' : ''} ${isCurrentNote && showCurrent ? 'current' : isRootNote && showRoot ? 'root' : isInScale && showScale ? 'in-scale' : ''} ${whiteText ? 'white-text' : 'black-text'}`}
                  title={`${fretNote.note} - String ${6 - stringIndex}, Fret ${fret}`}
                >
                  {shouldShowNote && (
                    <span className="note-label">{fretNote.note}</span>
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
          
          <div className="legend-item current-item" onClick={() => setShowCurrent(!showCurrent)}>
            <input 
              type="checkbox" 
              checked={showCurrent} 
              onChange={() => setShowCurrent(!showCurrent)}
            />
            <span>Interval{currentInterval ? `: ${currentInterval}` : ''}</span>
          </div>
        </div>
        
        {note.selectedScale && note.selectedNote && (
          <div className="scale-info">
            <span className="scale-name">{note.selectedNote} {note.selectedScale}</span>
          </div>
        )}
        {!note.selectedScale && note.selectedNote && (
          <div className="scale-info">
            <span className="scale-name">Chromatic</span>
          </div>
        )}
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