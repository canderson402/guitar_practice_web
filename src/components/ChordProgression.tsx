import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { scales, getScaleChords } from '../data/musicData';
import './ChordProgression.css';

// Legend entries for the chord-type help popover. Each entry pairs a plain-English
// name with a rooted example so the suffix convention is obvious (Major → C,
// Minor → Cm, Diminished → C°, etc.).
const CHORD_LEGEND: { label: string; example: string; intervals: string }[] = [
  { label: 'Major', example: 'C', intervals: '1-3-5' },
  { label: 'Minor', example: 'Cm', intervals: '1-♭3-5' },
  { label: 'Diminished', example: 'C°', intervals: '1-♭3-♭5' },
  { label: 'Augmented', example: 'C+', intervals: '1-3-♯5' },
  { label: 'Dominant 7th', example: 'C7', intervals: '1-3-5-♭7' },
  { label: 'Major 7th', example: 'Cmaj7', intervals: '1-3-5-7' },
  { label: 'Minor 7th', example: 'Cm7', intervals: '1-♭3-5-♭7' },
  { label: 'Half-diminished 7th', example: 'Cø7', intervals: '1-♭3-♭5-♭7' },
  { label: 'Diminished 7th', example: 'C°7', intervals: '1-♭3-♭5-𝄫7' },
];

export const ChordProgression: React.FC = () => {
  const {
    note,
    setSelectedScale,
    setSelectedChord,
  } = useStore();

  const [showLegend, setShowLegend] = useState(false);

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

  // Click handler: toggle selection. Clicking the active chord clears it;
  // clicking any other chord replaces the current selection.
  const handleChordClick = (chord: { note: string; type: string; symbol: string; roman: string }) => {
    const active = note.selectedChord;
    const isSame = active && active.note === chord.note && active.type === chord.type;
    setSelectedChord(isSame ? null : chord);
  };

  const isActive = (chord: { note: string; type: string }) =>
    note.selectedChord?.note === chord.note && note.selectedChord?.type === chord.type;

  return (
    <div className="chord-progression">
      {note.selectedNote && note.selectedScale ? (
        <div className="scale-chords-display">
          <div className="scale-label">
            Chords in {note.selectedNote} {note.selectedScale}
            <button
              type="button"
              className={`chord-help-btn ${showLegend ? 'active' : ''}`}
              onClick={() => setShowLegend(v => !v)}
              aria-label="Chord type reference"
              aria-expanded={showLegend}
              title="What do these chord symbols mean?"
            >
              ?
            </button>
          </div>
          {showLegend && (
            <ul className="chord-legend" role="region" aria-label="Chord type reference">
              {CHORD_LEGEND.map(entry => (
                <li key={entry.label} className="chord-legend-item">
                  <span className="chord-legend-label">{entry.label}</span>
                  <span className="chord-legend-example">({entry.example})</span>
                  <span className="chord-legend-intervals">({entry.intervals})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="scale-chords">
            {scaleChords.map((chord, i) => {
              const active = isActive(chord);
              return (
                <button
                  key={i}
                  type="button"
                  className={`scale-chord ${active ? 'active' : ''}`}
                  onClick={() => handleChordClick(chord)}
                  aria-pressed={active}
                  title={`${active ? 'Hide' : 'Highlight'} ${chord.note}${chord.symbol} on the fretboard`}
                >
                  <div className="chord-name">{chord.note}{chord.symbol}</div>
                  <div className="chord-roman">{chord.roman}</div>
                </button>
              );
            })}
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