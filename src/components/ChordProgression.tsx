import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { scales, getScaleChords } from '../data/musicData';
import './ChordProgression.css';

export const ChordProgression: React.FC = () => {
  const { 
    note,
    setSelectedScale
  } = useStore();
  
  // Validate selected scale and reset if invalid
  useEffect(() => {
    if (note.selectedScale && !scales[note.selectedScale as keyof typeof scales]) {
      setSelectedScale('Major (Ionian)');
    }
  }, [note.selectedScale, setSelectedScale]);

  // Get chords for the selected scale
  const scaleChords = note.selectedNote && note.selectedScale 
    ? getScaleChords(note.selectedNote, note.selectedScale as keyof typeof scales)
    : [];
  
  return (
    <div className="chord-progression">
      {note.selectedNote && note.selectedScale ? (
        <div className="scale-chords-display">
          <div className="scale-label">
            Chords in {note.selectedNote} {note.selectedScale}
          </div>
          <div className="scale-chords">
            {scaleChords.map((chord, i) => (
              <div key={i} className="scale-chord">
                <div className="chord-name">{chord.note}{chord.symbol}</div>
                <div className="chord-roman">{chord.roman}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-scale-message">
          Select a root note and scale to see chords
        </div>
      )}
    </div>
  );
};