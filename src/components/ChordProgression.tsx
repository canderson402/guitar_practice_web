import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { notes, scales, getScaleChords, majorProgressions, minorProgressions, scaleSuggestions, musicalStyles } from '../data/musicData';
import './ChordProgression.css';

export const ChordProgression: React.FC = () => {
  const { 
    note,
    metronome,
    chordProgression,
    setSelectedChordProgression,
    setCurrentChordIndex,
    setChordAutoAdvance,
    setChordKeyType,
    setChordSelectedStyle
  } = useStore();
  
  const barCountRef = useRef(0);
  const wasOnFirstBeatRef = useRef(false);
  const [, forceUpdate] = useState({});
  
  // Get available progressions based on key type
  const availableProgressions = chordProgression.keyType === 'major' ? majorProgressions : minorProgressions;

  // Get scale suggestion
  const scaleSuggestion = note.selectedScale ? scaleSuggestions[note.selectedScale] : null;
  
  // Auto-update keyType based on scale suggestion (but not if it's 'both')
  useEffect(() => {
    if (scaleSuggestion && scaleSuggestion !== 'both') {
      setChordKeyType(scaleSuggestion);
    }
  }, [note.selectedScale, scaleSuggestion, setChordKeyType]);

  // Get chords for the selected scale - always show them
  const scaleChords = note.selectedNote && note.selectedScale 
    ? getScaleChords(note.selectedNote, note.selectedScale as keyof typeof scales)
    : [];
  
  // Convert Roman numeral to actual chord
  const romanToChord = (roman: string, rootNote: string) => {
    if (!rootNote) return null;
    
    const rootIndex = notes.indexOf(rootNote);
    if (rootIndex === -1) return null;
    
    // Parse the Roman numeral
    let numeral = roman;
    let isFlat = false;
    let isSharp = false;
    let chordType = 'major';
    let symbol = '';
    
    // Handle flat/sharp prefixes
    if (numeral.startsWith('b')) {
      isFlat = true;
      numeral = numeral.substring(1);
    } else if (numeral.startsWith('#')) {
      isSharp = true;
      numeral = numeral.substring(1);
    }
    
    // Handle chord quality suffixes
    if (numeral.includes('dim') || numeral.includes('°')) {
      chordType = 'diminished';
      symbol = '°';
      numeral = numeral.replace(/dim|°/g, '');
    } else if (numeral.includes('+')) {
      chordType = 'augmented';
      symbol = '+';
      numeral = numeral.replace(/\+/g, '');
    } else if (numeral.includes('7')) {
      if (numeral.includes('maj7')) {
        chordType = 'major7';
        symbol = 'maj7';
        numeral = numeral.replace(/maj7/g, '');
      } else {
        chordType = 'dominant7';
        symbol = '7';
        numeral = numeral.replace(/7/g, '');
      }
    } else if (numeral.includes('9')) {
      chordType = 'dominant7'; // Treat 9th as dominant for simplicity
      symbol = '9';
      numeral = numeral.replace(/9/g, '');
    }
    
    // Determine if minor based on lowercase
    const isLowerCase = numeral !== numeral.toUpperCase();
    if (isLowerCase && chordType === 'major') {
      chordType = 'minor';
      symbol = 'm';
    }
    
    // Convert to scale degree (0-based)
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    const scaleIndex = romanNumerals.indexOf(numeral.toUpperCase());
    
    if (scaleIndex === -1) return null;
    
    // Calculate the note index
    let noteIndex = rootIndex;
    const intervals = [0, 2, 4, 5, 7, 9, 11]; // Major scale intervals
    noteIndex = (noteIndex + intervals[scaleIndex]) % 12;
    
    // Apply flat/sharp
    if (isFlat) noteIndex = (noteIndex - 1 + 12) % 12;
    if (isSharp) noteIndex = (noteIndex + 1) % 12;
    
    return {
      roman,
      note: notes[noteIndex],
      type: chordType,
      symbol
    };
  };

  // Parse progression to get actual chords
  const getProgressionChords = () => {
    if (!chordProgression.selectedProgression || !note.selectedNote) return [];
    
    const progression = (availableProgressions as any)[chordProgression.selectedProgression] || [];
    
    return progression.map((roman: string) => romanToChord(roman, note.selectedNote!))
                     .filter((chord: any) => chord !== null);
  };
  
  const progressionChords = getProgressionChords();
  const currentChord = progressionChords[chordProgression.currentChordIndex % progressionChords.length];
  
  // Calculate countdown to next chord
  const getCountdown = () => {
    if (!chordProgression.autoAdvance || !metronome.isPlaying || progressionChords.length <= 1) {
      return null;
    }
    
    const currentBar = barCountRef.current;
    const nextChangeBar = Math.ceil((currentBar + 1) / chordProgression.barsPerChord) * chordProgression.barsPerChord;
    const barsRemaining = nextChangeBar - currentBar;
    
    // If we're on the last bar, show beats remaining
    if (barsRemaining === 1) {
      const beatsRemaining = metronome.beatsPerMeasure - metronome.currentBeat;
      return {
        type: 'beats',
        value: beatsRemaining,
        total: metronome.beatsPerMeasure
      };
    }
    
    return {
      type: 'bars',
      value: barsRemaining,
      total: chordProgression.barsPerChord
    };
  };
  
  const countdown = getCountdown();
  
  // Handle chord click
  const handleChordClick = (index: number) => {
    setCurrentChordIndex(index);
  };
  
  // Reset counter when metronome stops
  useEffect(() => {
    if (!metronome.isPlaying) {
      barCountRef.current = 0;
      wasOnFirstBeatRef.current = false;
    }
  }, [metronome.isPlaying]);
  
  // Auto-advance logic
  useEffect(() => {
    if (!chordProgression.autoAdvance || !metronome.isPlaying || progressionChords.length <= 1) return;
    
    const isFirstBeat = metronome.currentBeat === 0;
    
    // Detect transition to first beat
    if (isFirstBeat && !wasOnFirstBeatRef.current) {
      barCountRef.current += 1;
      
      // Change chord every X bars
      if (barCountRef.current % chordProgression.barsPerChord === 0) {
        setCurrentChordIndex((chordProgression.currentChordIndex + 1) % progressionChords.length);
      }
    }
    
    wasOnFirstBeatRef.current = isFirstBeat;
  }, [
    metronome.currentBeat,
    metronome.isPlaying,
    chordProgression.autoAdvance,
    chordProgression.barsPerChord,
    chordProgression.currentChordIndex,
    progressionChords.length,
    setCurrentChordIndex
  ]);
  
  // Force re-render for countdown
  useEffect(() => {
    if (!chordProgression.autoAdvance || !metronome.isPlaying || progressionChords.length <= 1) return;
    
    const interval = setInterval(() => {
      forceUpdate({});
    }, 200);
    
    return () => clearInterval(interval);
  }, [chordProgression.autoAdvance, metronome.isPlaying, progressionChords.length]);
  
  const handleProgressionChange = (progression: string | null) => {
    setSelectedChordProgression(progression);
    setCurrentChordIndex(0);
    barCountRef.current = 0;
  };

  // Generate YouTube search URL for backing track
  const generateBackingTrackSearch = () => {
    if (!note.selectedNote || !note.selectedScale) return;
    
    const key = note.selectedNote;
    const keyType = chordProgression.keyType;
    const style = chordProgression.selectedStyle;
    
    // Create search query
    const searchQuery = `${key} ${keyType} ${style} backing track jam track`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
    
    // Open in new tab
    window.open(youtubeUrl, '_blank');
  };
  
  return (
    <div className="chord-progression">
      {/* Top controls */}
      <div className="top-controls">
        <div className="progression-controls">
          <div className="control-group">
            <label>Key Type:</label>
            <select 
              value={chordProgression.keyType} 
              onChange={(e) => setChordKeyType(e.target.value as 'major' | 'minor')}
              className="select-input"
              disabled={!note.selectedNote || !note.selectedScale}
            >
              <option value="major">Major</option>
              <option value="minor">Minor</option>
            </select>
          </div>
          
          {scaleSuggestion && note.selectedScale && (
            <div className="scale-suggestion">
              <span className="suggestion-text">
                Suggested: Use {scaleSuggestion === 'both' ? 'major or minor' : scaleSuggestion} progressions with {note.selectedScale}
              </span>
            </div>
          )}
          
          <div className="control-group">
            <label>Progression:</label>
            <select 
              value={chordProgression.selectedProgression || ''} 
              onChange={(e) => handleProgressionChange(e.target.value || null)}
              className="select-input"
              disabled={!note.selectedNote || !note.selectedScale}
            >
              <option value="">Select a progression</option>
              {Object.keys(availableProgressions).map(prog => (
                <option key={prog} value={prog}>{prog}</option>
              ))}
            </select>
          </div>
          
          
          {progressionChords.length > 0 && (
            <button 
              onClick={() => setCurrentChordIndex((chordProgression.currentChordIndex + 1) % progressionChords.length)} 
              className="next-button"
            >
              Next Chord
            </button>
          )}
        </div>
        
        <div className="right-column">
          <div className="auto-advance">
            {/* Auto-advance controls */}
            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={chordProgression.autoAdvance}
                  onChange={(e) => setChordAutoAdvance(e.target.checked)}
                  disabled={!chordProgression.selectedProgression}
                />
                Auto-advance
              </label>
            </div>
            
            <div className="control-group">
              <label>Bars per chord:</label>
              <input 
                type="number" 
                min="1" 
                max="8"
                value={chordProgression.barsPerChord}
                onChange={(e) => useStore.getState().setChordBarsPerChord(parseInt(e.target.value) || 1)}
                className="interval-input"
                disabled={!chordProgression.autoAdvance || !chordProgression.selectedProgression}
              />
            </div>
            
            {chordProgression.autoAdvance && metronome.isPlaying && chordProgression.selectedProgression && (
              <div className="auto-advance-status">
                Auto-advancing with metronome
              </div>
            )}
          </div>
          
          {/* Backing Track Section - separate box underneath auto-advance */}
          {note.selectedNote && note.selectedScale && (
            <div className="backing-track-section">
              <div className="backing-track-header">
                <h4>Backing Track</h4>
              </div>
              <div className="backing-track-controls">
                <div className="control-group">
                  <label>Style:</label>
                  <select 
                    value={chordProgression.selectedStyle} 
                    onChange={(e) => setChordSelectedStyle(e.target.value)}
                    className="select-input"
                  >
                    {musicalStyles.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
                
                <button 
                  onClick={generateBackingTrackSearch}
                  className="backing-track-button"
                  title={`Search for ${note.selectedNote || ''} ${chordProgression.keyType} ${chordProgression.selectedStyle} backing tracks`}
                >
                  🎵 Find Backing Track
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Current chord display or select progression message */}
      {note.selectedNote && note.selectedScale && (
        <div className="chord-content">
          {!chordProgression.selectedProgression ? (
            <div className="no-progression-message">
              Select a progression to show chords
            </div>
          ) : currentChord && progressionChords.length > 0 ? (
            <>
              <div className="chord-display">
                <div className="current-chord-container">
                  <div className="current-chord">
                    {currentChord.note}{currentChord.symbol}
                  </div>
                  <div className="chord-roman">
                    {currentChord.roman}
                  </div>
                </div>
                
                {countdown && (
                  <div className="countdown-container">
                    <span className="countdown-prefix">Next in:</span>
                    <div className="countdown-display">
                      <span className={`countdown-value ${countdown.type === 'beats' ? 'final-bar' : ''}`}>
                        {countdown.value}
                      </span>
                      <span className="countdown-label">
                        {countdown.type === 'bars' ? 
                          (countdown.value === 1 ? 'bar' : 'bars') : 
                          (countdown.value === 1 ? 'beat' : 'beats')
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Progression display */}
              <div className="progression-display">
                <div className="progression-label">
                  {chordProgression.selectedProgression} in {note.selectedNote} {note.selectedScale}
                </div>
                <div className="progression-chords">
                  {progressionChords.map((chord: any, i: number) => (
                    <span 
                      key={i} 
                      className={`progression-chord ${i === chordProgression.currentChordIndex ? 'active' : ''} clickable`}
                      onClick={() => handleChordClick(i)}
                    >
                      <div className="chord-name">{chord.note}{chord.symbol}</div>
                      <div className="chord-roman">{chord.roman}</div>
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
      
      {/* Scale chords - show below progression */}
      {scaleChords.length > 0 && (
        <div className="scale-chords">
          <div className="scale-chords-label">
            Chords in {note.selectedNote} {note.selectedScale}:
          </div>
          <div className="scale-chords-list">
            {scaleChords.map((chord, i) => (
              <span key={i} className="scale-chord">
                <div className="chord-name">{chord.note}{chord.symbol}</div>
                <div className="chord-roman">{chord.roman}</div>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {(!note.selectedNote || !note.selectedScale) && (
        <div className="no-scale-message">
          Select a root note and scale to see chord progressions
        </div>
      )}
      
    </div>
  );
};