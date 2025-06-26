import React from 'react';
import { useStore } from '../store/useStore';
import { notes, getScaleNotes } from '../data/musicData';
import { generateFretboard, fretMarkers, doubleFretMarkers, isNoteInScale } from '../data/guitarData';
import './GuitarNeck.css';

export const GuitarNeck: React.FC = () => {
  const { note } = useStore();
  const [show24Frets, setShow24Frets] = React.useState(false);
  
  // Generate the fretboard data
  const fretboard = generateFretboard(undefined, show24Frets ? 24 : 15);
  
  // Get current scale notes
  const currentNotes = note.selectedScale && note.selectedNote
    ? getScaleNotes(note.selectedNote, note.selectedScale as keyof typeof import('../data/musicData').scales)
    : note.selectedNote
    ? notes // All notes when single note selected
    : [];
  
  // Get current note being highlighted
  const currentHighlightNote = currentNotes.length > 0 
    ? currentNotes[Math.min(note.currentNoteIndex, currentNotes.length - 1)]
    : null;
  
  const renderFret = (fret: number) => {
    const isMarkedFret = fretMarkers.includes(fret);
    const isDoubleDot = doubleFretMarkers.includes(fret);
    
    return (
      <div key={fret} className={`fret ${fret === 0 ? 'nut' : ''}`}>
        {/* Fret number */}
        {fret > 0 && (
          <div className="fret-number">{fret}</div>
        )}
        
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
            const isCurrentNote = fretNote.note === currentHighlightNote;
            const isRootNote = fretNote.note === note.selectedNote;
            
            return (
              <div key={stringIndex} className="string-container">
                <div className={`guitar-string string-${stringIndex}`} />
                <div 
                  className={`note-position ${isInScale ? 'in-scale' : ''} ${isCurrentNote ? 'current' : ''} ${isRootNote ? 'root' : ''}`}
                  title={`${fretNote.note} - String ${6 - stringIndex}, Fret ${fret}`}
                >
                  {(isInScale || isCurrentNote) && (
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
      <div className="neck-info">
        <div className="neck-controls">
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
        </div>
        
        {note.selectedScale && note.selectedNote && (
          <div className="scale-info">
            <span className="scale-name">{note.selectedNote} {note.selectedScale}</span>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-dot root"></div>
                <span>Root ({note.selectedNote})</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot scale"></div>
                <span>Scale notes</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot current"></div>
                <span>Current note</span>
              </div>
            </div>
          </div>
        )}
        {!note.selectedScale && note.selectedNote && (
          <div className="scale-info">
            <span className="scale-name">Chromatic</span>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-dot current"></div>
                <span>Current: {currentHighlightNote}</span>
              </div>
            </div>
          </div>
        )}
        {!note.selectedNote && (
          <div className="no-selection">
            Select a note or scale to see it on the fretboard
          </div>
        )}
      </div>
      
      {(note.selectedNote || note.selectedScale) && (
        <div className="fretboard">
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
      )}
    </div>
  );
};