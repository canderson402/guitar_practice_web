import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button, ToggleButtonGroup } from '../ui';
import './CircleOfFifths.css';

export const CircleOfFifths: React.FC = () => {
  const { 
    note, 
    setSelectedNote
  } = useStore();
  const [mode, setMode] = useState<'major' | 'minor'>('major');
  const [displayMode, setDisplayMode] = useState<'chords' | 'relatives'>('chords');
  

  // Circle of Fifths in order (starting from C at 12 o'clock)
  const circleOfFifthsNotes = [
    'C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'
  ];
  

  // Minor keys (relative minors) - keep simple without enharmonic equivalents
  const relativeMinors = [
    'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m', 'Fm', 'Cm', 'Gm', 'Dm'
  ];

  // Helper function to get chromatic position of a note
  const getChromaticPosition = (noteName: string): number => {
    const chromaticMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return chromaticMap[noteName] ?? 0;
  };

  // Get the diatonic chords for the current key and mode
  const getDiatonicChords = () => {
    if (!note.selectedNote) return { majorChords: [], minorChords: [] };
    
    const rootNote = note.selectedNote;
    
    if (mode === 'major') {
      // For C major: I=C, ii=Dm, iii=Em, IV=F, V=G, vi=Am, vii°=B° (skip diminished)
      const majorKeyMap: { [key: string]: { majorChords: string[], minorChords: string[] } } = {
        'C': { majorChords: ['C', 'F', 'G'], minorChords: ['Dm', 'Em', 'Am'] },
        'G': { majorChords: ['G', 'C', 'D'], minorChords: ['Am', 'Bm', 'Em'] },
        'D': { majorChords: ['D', 'G', 'A'], minorChords: ['Bm', 'C#m', 'F#m'] },
        'A': { majorChords: ['A', 'D', 'E'], minorChords: ['C#m', 'D#m', 'G#m'] },
        'E': { majorChords: ['E', 'A', 'B'], minorChords: ['D#m', 'F#m', 'C#m'] },
        'B': { majorChords: ['B', 'E', 'Gb'], minorChords: ['F#m', 'G#m', 'D#m'] },
        'Gb': { majorChords: ['Gb', 'B', 'Db'], minorChords: ['G#m', 'A#m', 'D#m'] },
        'Db': { majorChords: ['Db', 'Gb', 'Ab'], minorChords: ['A#m', 'Cm', 'Fm'] },
        'Ab': { majorChords: ['Ab', 'Db', 'Eb'], minorChords: ['Cm', 'Dm', 'Gm'] },
        'Eb': { majorChords: ['Eb', 'Ab', 'Bb'], minorChords: ['Dm', 'Em', 'Am'] },
        'Bb': { majorChords: ['Bb', 'Eb', 'F'], minorChords: ['Em', 'Fm', 'Bm'] },
        'F': { majorChords: ['F', 'Bb', 'C'], minorChords: ['Fm', 'Gm', 'Cm'] }
      };
      
      return majorKeyMap[rootNote] || { majorChords: [], minorChords: [] };
    } else {
      // For A minor: i=Am, ii°=B°(skip), III=C, iv=Dm, v=Em, VI=F, VII=G
      const minorKeyMap: { [key: string]: { majorChords: string[], minorChords: string[] } } = {
        'A': { majorChords: ['C', 'F', 'G'], minorChords: ['Am', 'Dm', 'Em'] },
        'E': { majorChords: ['G', 'C', 'D'], minorChords: ['Em', 'Am', 'Bm'] },
        'B': { majorChords: ['D', 'G', 'A'], minorChords: ['Bm', 'Em', 'F#m'] },
        'Gb': { majorChords: ['A', 'D', 'E'], minorChords: ['F#m', 'Bm', 'C#m'] },
        'Db': { majorChords: ['E', 'A', 'B'], minorChords: ['C#m', 'F#m', 'G#m'] },
        'Ab': { majorChords: ['B', 'E', 'Gb'], minorChords: ['G#m', 'C#m', 'D#m'] },
        'Eb': { majorChords: ['Gb', 'B', 'Db'], minorChords: ['D#m', 'G#m', 'A#m'] },
        'Bb': { majorChords: ['Db', 'Gb', 'Ab'], minorChords: ['A#m', 'D#m', 'Fm'] },
        'F': { majorChords: ['Ab', 'Db', 'Eb'], minorChords: ['Fm', 'A#m', 'Cm'] },
        'C': { majorChords: ['Eb', 'Ab', 'Bb'], minorChords: ['Cm', 'Fm', 'Gm'] },
        'G': { majorChords: ['Bb', 'Eb', 'F'], minorChords: ['Gm', 'Cm', 'Dm'] },
        'D': { majorChords: ['F', 'Bb', 'C'], minorChords: ['Dm', 'Gm', 'Am'] }
      };
      
      return minorKeyMap[rootNote] || { majorChords: [], minorChords: [] };
    }
  };

  const diatonicChords = getDiatonicChords();

  // Check if a note is the root note
  const isRootNote = (circleNote: string) => {
    return note.selectedNote && getChromaticPosition(circleNote) === getChromaticPosition(note.selectedNote);
  };



  // Get the chord quality (I, ii, iii, etc.) for a chord root in the current key
  const getChordQuality = (circleNote: string) => {
    if (!note.selectedNote) return '';
    
    const rootChromaticPos = getChromaticPosition(note.selectedNote);
    const chordChromaticPos = getChromaticPosition(circleNote);
    const interval = (chordChromaticPos - rootChromaticPos + 12) % 12;
    
    if (mode === 'major') {
      const majorChordQualities = {
        0: 'I',      // Root - Major
        2: 'ii',     // 2nd - minor
        4: 'iii',    // 3rd - minor
        5: 'IV',     // 4th - Major
        7: 'V',      // 5th - Major
        9: 'vi',     // 6th - minor
        11: 'vii°'   // 7th - diminished
      };
      return majorChordQualities[interval as keyof typeof majorChordQualities] || '';
    } else {
      const minorChordQualities = {
        0: 'i',      // Root - minor
        2: 'ii°',    // 2nd - diminished
        3: 'III',    // 3rd - Major
        5: 'iv',     // 4th - minor
        7: 'v',      // 5th - minor
        8: 'VI',     // 6th - Major
        10: 'VII'    // 7th - Major
      };
      return minorChordQualities[interval as keyof typeof minorChordQualities] || '';
    }
  };

  // Get chord type for coloring (major, minor, diminished)
  const getChordType = (circleNote: string) => {
    const quality = getChordQuality(circleNote);
    if (!quality) return '';
    
    if (quality.includes('°')) return 'diminished';
    if (quality === quality.toLowerCase()) return 'minor';
    return 'major';
  };


  // Handle note click
  const handleNoteClick = (clickedNote: string) => {
    setSelectedNote(clickedNote);
  };

  // Create path for each segment
  const createSegmentPath = (index: number, outerRadius: number, innerRadius: number) => {
    const startAngle = (index * 30 - 105) * (Math.PI / 180); // Start 15 degrees before center
    const endAngle = (index * 30 - 75) * (Math.PI / 180);   // End 15 degrees after center
    const centerX = 200;
    const centerY = 200;
    
    const outerStart = {
      x: centerX + outerRadius * Math.cos(startAngle),
      y: centerY + outerRadius * Math.sin(startAngle)
    };
    const outerEnd = {
      x: centerX + outerRadius * Math.cos(endAngle),
      y: centerY + outerRadius * Math.sin(endAngle)
    };
    const innerStart = {
      x: centerX + innerRadius * Math.cos(startAngle),
      y: centerY + innerRadius * Math.sin(startAngle)
    };
    const innerEnd = {
      x: centerX + innerRadius * Math.cos(endAngle),
      y: centerY + innerRadius * Math.sin(endAngle)
    };
    
    return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y} Z`;
  };

  // Calculate text position for each segment
  const getTextPosition = (index: number, radius: number) => {
    const angle = (index * 30 - 90) * (Math.PI / 180); // Center angle for text
    const centerX = 200;
    const centerY = 200;
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  return (
    <div className="circle-of-fifths">
      {/* Controls */}
      <div className="circle-controls">
        <ToggleButtonGroup label="Key quality" layout="segmented">
          <Button variant="ghost" active={mode === 'major'} onClick={() => setMode('major')}>
            Major
          </Button>
          <Button variant="ghost" active={mode === 'minor'} onClick={() => setMode('minor')}>
            Minor
          </Button>
        </ToggleButtonGroup>

        <ToggleButtonGroup label="Display mode" layout="segmented">
          <Button variant="ghost" active={displayMode === 'chords'} onClick={() => setDisplayMode('chords')}>
            Chord Mode
          </Button>
          <Button variant="ghost" active={displayMode === 'relatives'} onClick={() => setDisplayMode('relatives')}>
            Relative Mode
          </Button>
        </ToggleButtonGroup>
      </div>
      
      
      <div className="circle-container">
        <svg width="400" height="400" viewBox="0 0 400 400">
          {/* Outer ring - Note names */}
          {circleOfFifthsNotes.map((noteKey, index) => {
            const isRoot = isRootNote(noteKey);
            const chordQuality = getChordQuality(noteKey);
            const chordType = getChordType(noteKey);
            const segmentPath = createSegmentPath(index, 190, 140);
            const textPos = getTextPosition(index, 165);
            
            let segmentClass = 'outer-segment';
            if (displayMode === 'chords') {
              // Chord Mode: show chord coloring
              if (chordQuality) {
                segmentClass += ` ${chordType}`;
                if (isRoot) segmentClass += ' root';
              }
            } else if (displayMode === 'relatives') {
              // Relative Mode: only highlight selected note
              if (isRoot) segmentClass += ' root';
            }
            
            return (
              <g key={`outer-${noteKey}-${index}`}>
                <path
                  d={segmentPath}
                  className={segmentClass}
                  stroke="#333"
                  strokeWidth="1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNoteClick(noteKey)}
                />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="note-text outer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNoteClick(noteKey)}
                >
                  {/* Add 'm' in Chord Mode for minor chords, or in Relative Mode when minor is selected */}
                  {((chordType === 'minor' && displayMode === 'chords' && chordQuality) || 
                    (displayMode === 'relatives' && mode === 'minor')) ? `${noteKey}m` : noteKey}
                </text>
              </g>
            );
          })}

          {/* Middle ring - Roman numerals or relative keys */}
          {circleOfFifthsNotes.map((noteKey, index) => {
            const chordQuality = getChordQuality(noteKey);
            const chordType = getChordType(noteKey);
            const segmentPath = createSegmentPath(index, 140, 80);
            const textPos = getTextPosition(index, 110);
            const relativeMinor = relativeMinors[index];
            
            if (!chordQuality && displayMode === 'chords') return null;
            
            let segmentClass = 'middle-segment';
            let displayText = '';
            
            if (displayMode === 'chords') {
              // Show chord qualities
              displayText = chordQuality;
              if (chordQuality) {
                segmentClass += ` ${chordType}`;
              }
            } else if (displayMode === 'relatives') {
              // Show relative keys
              if (mode === 'major') {
                // In major mode, show relative minors
                displayText = relativeMinor;
                // Highlight if this is the relative minor of the selected major key
                if (note.selectedNote && noteKey === note.selectedNote) {
                  segmentClass += ' relative-highlight-minor';
                }
              } else {
                // In minor mode, show relative majors
                // Each position in the circle should show its relative major
                // Position 0 (C) -> shows Eb (relative major of Cm)
                // Position 1 (G) -> shows Bb (relative major of Gm)
                // etc.
                const relativeMajors = [
                  'Eb',  // C minor -> Eb major
                  'Bb',  // G minor -> Bb major
                  'F',   // D minor -> F major
                  'C',   // A minor -> C major
                  'G',   // E minor -> G major
                  'D',   // B minor -> D major
                  'A',   // F# minor -> A major
                  'E',   // C# minor -> E major
                  'B',   // G# minor -> B major
                  'Gb',  // Eb minor -> Gb major
                  'Db',  // Bb minor -> Db major
                  'Ab'   // F minor -> Ab major
                ];
                
                displayText = relativeMajors[index];
                // Highlight if this is the relative major of the selected minor key
                if (note.selectedNote) {
                  const selectedIndex = circleOfFifthsNotes.indexOf(note.selectedNote);
                  if (selectedIndex !== -1 && relativeMajors[selectedIndex] === displayText) {
                    segmentClass += ' relative-highlight-major';
                  }
                }
              }
            }
            
            return (
              <g key={`middle-${noteKey}-${index}`}>
                <path
                  d={segmentPath}
                  className={segmentClass}
                  stroke="#333"
                  strokeWidth="1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleNoteClick(noteKey)}
                />
                {displayText && (
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="chord-text middle"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleNoteClick(noteKey)}
                  >
                    {displayText}
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Center circle */}
          <circle
            cx="200"
            cy="200"
            r="80"
            className="center-circle"
            fill="#f8f9fa"
            stroke="#333"
            strokeWidth="2"
          />
          
          {/* Center content */}
          {note.selectedNote ? (
            <>
              <text
                x="200"
                y="190"
                textAnchor="middle"
                dominantBaseline="middle"
                className="center-note"
              >
                {note.selectedNote}
              </text>
              <text
                x="200"
                y="210"
                textAnchor="middle"
                dominantBaseline="middle"
                className="center-mode"
              >
                {mode}
              </text>
            </>
          ) : (
            <>
              <text
                x="200"
                y="190"
                textAnchor="middle"
                dominantBaseline="middle"
                className="center-title"
              >
                Circle of
              </text>
              <text
                x="200"
                y="210"
                textAnchor="middle"
                dominantBaseline="middle"
                className="center-title"
              >
                Fifths
              </text>
            </>
          )}
        </svg>
      </div>
      
      
      {/* Legend */}
      <div className="chord-legend">
        <span className="legend-color major"></span>
        <span className="legend-label">Major</span>
        <span className="legend-color minor"></span>
        <span className="legend-label">Minor</span>
        <span className="legend-color diminished"></span>
        <span className="legend-label">Diminished</span>
      </div>
    </div>
  );
};