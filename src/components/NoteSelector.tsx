import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { notes, scales, getScaleNotes, musicalStyles } from '../data/musicData';
import './NoteSelector.css';

export const NoteSelector: React.FC = () => {
  const { 
    note, 
    timer,
    metronome,
    chordProgression,
    setSelectedNote, 
    setSelectedScale, 
    setCurrentNoteIndex,
    setNextNoteIndex,
    setChangeMode,
    setChangeInterval,
    setRandomize,
    setShowNextNote,
    setAutoAdvanceEnabled,
    setChordSelectedStyle
  } = useStore();
  
  const barCountRef = useRef(0);
  const lastChangeTimeRef = useRef(0);
  const wasOnFirstBeatRef = useRef(false);
  const [, forceUpdate] = useState({});
  
  // Validate selected scale and reset if invalid
  useEffect(() => {
    if (note.selectedScale && !scales[note.selectedScale as keyof typeof scales]) {
      setSelectedScale('Major (Ionian)');
    }
  }, [note.selectedScale, setSelectedScale]);
  
  const currentNotes = note.selectedScale && note.selectedNote
    ? getScaleNotes(note.selectedNote, note.selectedScale as keyof typeof scales)
    : note.selectedNote
    ? notes // When single note is selected, cycle through all notes
    : [];
  
  // Calculate next note for preview using pre-determined index
  const getNextNote = () => {
    if (currentNotes.length <= 1) return null;
    return currentNotes[note.nextNoteIndex];
  };
  
  const nextNote = getNextNote();
  
  // Helper function to get chromatic position of a note
  const getChromaticPosition = (noteName: string): number => {
    const chromaticMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return chromaticMap[noteName] ?? 0;
  };

  // Calculate interval from root note
  const getInterval = (note: string, rootNote: string) => {
    const intervals = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
    
    const rootChromaticPos = getChromaticPosition(rootNote);
    const noteChromaticPos = getChromaticPosition(note);
    
    const intervalIndex = (noteChromaticPos - rootChromaticPos + 12) % 12;
    return intervals[intervalIndex];
  };
  
  // Get interval quality and name
  const getIntervalQuality = (note: string, rootNote: string) => {
    const intervalQualities = [
      { number: '1', quality: 'Perfect', name: 'Unison' },
      { number: '♭2', quality: 'Minor', name: 'Second' },
      { number: '2', quality: 'Major', name: 'Second' },
      { number: '♭3', quality: 'Minor', name: 'Third' },
      { number: '3', quality: 'Major', name: 'Third' },
      { number: '4', quality: 'Perfect', name: 'Fourth' },
      { number: '♭5', quality: 'Diminished', name: 'Fifth' },
      { number: '5', quality: 'Perfect', name: 'Fifth' },
      { number: '♭6', quality: 'Minor', name: 'Sixth' },
      { number: '6', quality: 'Major', name: 'Sixth' },
      { number: '♭7', quality: 'Minor', name: 'Seventh' },
      { number: '7', quality: 'Major', name: 'Seventh' }
    ];
    
    const rootChromaticPos = getChromaticPosition(rootNote);
    const noteChromaticPos = getChromaticPosition(note);
    
    const intervalIndex = (noteChromaticPos - rootChromaticPos + 12) % 12;
    return intervalQualities[intervalIndex];
  };
  
  // Handle clicking on a scale note
  const handleNoteClick = (noteIndex: number) => {
    setCurrentNoteIndex(noteIndex);
  };
  
  // Calculate countdown to next note
  const getCountdown = () => {
    if (currentNotes.length <= 1) return null;
    
    if (note.changeMode === 'bars' && metronome.isPlaying) {
      const currentBar = barCountRef.current;
      const nextChangeBar = Math.ceil((currentBar + 1) / note.changeInterval) * note.changeInterval;
      const barsRemaining = nextChangeBar - currentBar;
      
      // If we're on the last bar, show beats remaining instead
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
        total: note.changeInterval
      };
    } else if (note.changeMode === 'time' && timer.isRunning) {
      // Calculate remaining time in current interval
      const currentCycle = Math.floor(timer.elapsedSeconds / note.changeInterval);
      const nextChangeTime = (currentCycle + 1) * note.changeInterval;
      const timeRemaining = nextChangeTime - timer.elapsedSeconds;
      
      return {
        type: 'seconds',
        value: Math.max(0, Math.ceil(timeRemaining)),
        total: note.changeInterval
      };
    }
    
    return null;
  };
  
  const countdown = getCountdown();
  
  // Function to generate next random index
  const generateRandomIndex = (currentIndex: number, arrayLength: number): number => {
    if (arrayLength <= 1) return 0;
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * arrayLength);
    } while (randomIndex === currentIndex);
    return randomIndex;
  };
  
  // Update next note whenever current note or settings change
  useEffect(() => {
    if (currentNotes.length > 1) {
      const nextIndex = note.randomize 
        ? generateRandomIndex(note.currentNoteIndex, currentNotes.length)
        : (note.currentNoteIndex + 1) % currentNotes.length;
      setNextNoteIndex(nextIndex);
    }
  }, [note.currentNoteIndex, note.randomize, currentNotes.length, setNextNoteIndex]);

  // Reset counters when metronome stops or timer resets
  useEffect(() => {
    if (!metronome.isPlaying) {
      barCountRef.current = 0;
      wasOnFirstBeatRef.current = false;
    }
  }, [metronome.isPlaying]);
  
  useEffect(() => {
    if (!timer.isRunning) {
      lastChangeTimeRef.current = 0;
    } else if (timer.elapsedSeconds === 0) {
      // Reset to 0 when timer starts fresh
      lastChangeTimeRef.current = 0;
    }
  }, [timer.isRunning, timer.elapsedSeconds]);
  
  useEffect(() => {
    if (currentNotes.length <= 1 || note.changeMode === 'none') return;
    
    if (note.changeMode === 'bars' && metronome.isPlaying) {
      const isFirstBeat = metronome.currentBeat === 0;
      
      // Detect transition to first beat
      if (isFirstBeat && !wasOnFirstBeatRef.current) {
        barCountRef.current += 1;
        
        // Change note every X bars
        if (barCountRef.current % note.changeInterval === 0) {
          // Move to the pre-determined next note
          setCurrentNoteIndex(note.nextNoteIndex);
        }
      }
      
      wasOnFirstBeatRef.current = isFirstBeat;
    } else if (note.changeMode === 'time' && timer.isRunning) {
      const currentTime = timer.elapsedSeconds;
      
      if (currentTime > 0 && currentTime - lastChangeTimeRef.current >= note.changeInterval) {
        // Move to the pre-determined next note
        setCurrentNoteIndex(note.nextNoteIndex);
        lastChangeTimeRef.current = currentTime;
      }
    }
  }, [
    timer.isRunning,
    timer.elapsedSeconds,
    metronome.currentBeat,
    metronome.isPlaying,
    note.changeMode,
    note.changeInterval,
    note.nextNoteIndex,
    note.autoAdvanceEnabled,
    currentNotes.length,
    setCurrentNoteIndex
  ]);
  
  // Force re-render for countdown updates
  useEffect(() => {
    const isActive = (note.changeMode === 'bars' && metronome.isPlaying) || 
                     (note.changeMode === 'time' && timer.isRunning);
    
    if (!isActive || currentNotes.length <= 1) return;
    
    const interval = setInterval(() => {
      forceUpdate({}); // Force re-render to update countdown
    }, 200); // Update every 200ms for smooth countdown
    
    return () => clearInterval(interval);
  }, [note.changeMode, metronome.isPlaying, timer.isRunning, currentNotes.length]);
  
  const handleNoteChange = (newNote: string | null) => {
    setSelectedNote(newNote);
    // When switching to single note mode, start from the selected note's index
    if (newNote && !note.selectedScale) {
      const noteIndex = notes.indexOf(newNote);
      setCurrentNoteIndex(noteIndex >= 0 ? noteIndex : 0);
    } else {
      setCurrentNoteIndex(0);
    }
    // Reset next note index - it will be recalculated by the useEffect
    setNextNoteIndex(1);
  };
  
  const handleScaleChange = (newScale: string | null) => {
    setSelectedScale(newScale);
    setCurrentNoteIndex(0);
    // Reset next note index - it will be recalculated by the useEffect
    setNextNoteIndex(1);
  };
  
  const handleNext = () => {
    if (currentNotes.length > 0) {
      // Move to the pre-determined next note
      setCurrentNoteIndex(note.nextNoteIndex);
    }
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
    <div className="note-selector">
      <div className="top-controls">
        <div className="selection-controls">
          <div className="control-group">
            <label>Root Note:</label>
            <select 
              value={note.selectedNote || ''} 
              onChange={(e) => handleNoteChange(e.target.value || null)}
              className="select-input"
            >
              <option value="">Select a note</option>
              {notes.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label>Scale:</label>
            <select 
              value={note.selectedScale || ''} 
              onChange={(e) => handleScaleChange(e.target.value || null)}
              className="select-input"
            >
              <option value="">Chromatic</option>
              {Object.keys(scales).map(scale => (
                <option key={scale} value={scale}>{scale}</option>
              ))}
            </select>
          </div>
          
          {currentNotes.length > 1 && (
            <button onClick={handleNext} className="next-button">
              Next Note
            </button>
          )}
        </div>
        
        {currentNotes.length > 1 && (
          <div className="auto-advance">
            <div className="toggle-controls">
              <div className="toggle-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={note.randomize}
                    onChange={(e) => setRandomize(e.target.checked)}
                  />
                  Randomize
                </label>
              </div>
              
              <div className="toggle-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={note.showNextNote}
                    onChange={(e) => setShowNextNote(e.target.checked)}
                  />
                  Show Next
                </label>
              </div>
            </div>
            
            <div className="control-group">
              <label>Auto-advance:</label>
              <select 
                value={note.changeMode} 
                onChange={(e) => setChangeMode(e.target.value as 'none' | 'bars' | 'time')}
                className="select-input"
              >
                <option value="none">None</option>
                <option value="bars">bars</option>
                <option value="time">seconds</option>
              </select>
            </div>
            
            <div className="control-group">
              <label>{note.changeMode === 'bars' ? 'Bars:' : note.changeMode === 'time' ? 'Seconds:' : 'Interval:'}</label>
              <input 
                type="number" 
                min="1" 
                max="16"
                value={note.changeInterval}
                onChange={(e) => setChangeInterval(parseInt(e.target.value) || 1)}
                className="interval-input"
                disabled={note.changeMode === 'none'}
              />
            </div>
            
            {note.changeMode !== 'none' && ((note.changeMode === 'bars' && metronome.isPlaying) || 
              (note.changeMode === 'time' && timer.isRunning)) && (
              <div className="auto-advance-status">
                Auto-advancing {note.changeMode === 'bars' ? 'with metronome' : 'with timer'}
              </div>
            )}
          </div>
        )}
      </div>
      
      {currentNotes.length > 0 && (
        <>
          <div className="note-content">
            <div className="note-display">
              <div className="current-note-container">
                <div className="current-note">
                  {currentNotes[Math.min(note.currentNoteIndex, currentNotes.length - 1)]}
                </div>
                {note.selectedNote && (
                  <div className="interval-info">
                    {(() => {
                      const currentNote = currentNotes[Math.min(note.currentNoteIndex, currentNotes.length - 1)];
                      const intervalData = getIntervalQuality(currentNote, note.selectedNote);
                      if (!intervalData) return null;
                      
                      return (
                        <>
                          <div className="interval-number">{intervalData.number}</div>
                          <div className="interval-quality">{intervalData.quality} {intervalData.name}</div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              {note.showNextNote && nextNote && (
                <div className="next-note-indicator">
                    <span className="next-label">Next:</span>
                    <span className="next-note">{nextNote}</span>
                    {countdown && (
                      <div className="countdown">
                        <span className="countdown-prefix">Next in:</span>
                        <div className="countdown-display">
                          <span className={`countdown-value ${countdown.type === 'beats' ? 'final-bar' : ''}`}>
                            {countdown.value}
                          </span>
                          <span className="countdown-label">
                            {countdown.type === 'bars' ? 
                              (countdown.value === 1 ? 'bar' : 'bars') : 
                            countdown.type === 'beats' ?
                              (countdown.value === 1 ? 'beat' : 'beats') :
                              (countdown.value === 1 ? 'sec' : 'secs')
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              {currentNotes.length > 1 && (
                <>
                  <div className="scale-label">
                    {note.selectedScale ? `${note.selectedNote} ${note.selectedScale}` : 'Chromatic'}
                  </div>
                  <div className="scale-notes">
                    {(note.selectedScale ? currentNotes : notes).map((n, i) => {
                      const isActive = note.selectedScale 
                        ? i === note.currentNoteIndex 
                        : n === currentNotes[Math.min(note.currentNoteIndex, currentNotes.length - 1)];
                      
                      const interval = note.selectedNote ? getInterval(n, note.selectedNote) : '';
                      
                      return (
                        <span 
                          key={i} 
                          className={`scale-note ${isActive ? 'active' : ''} clickable`}
                          onClick={() => {
                            if (note.selectedScale) {
                              handleNoteClick(i);
                            } else {
                              const noteIndex = notes.indexOf(n);
                              if (noteIndex !== -1) {
                                handleNoteClick(noteIndex);
                              }
                            }
                          }}
                        >
                          <div className="note-name">{n}</div>
                          {interval && <div className="note-interval">{interval}</div>}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Backing Track Section */}
      {note.selectedNote && note.selectedScale && (
        <div className="backing-track-inline">
          <label>Backing Track:</label>
          <select 
            value={chordProgression.selectedStyle} 
            onChange={(e) => setChordSelectedStyle(e.target.value)}
            className="style-select"
          >
            {musicalStyles.map(style => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
          <button 
            onClick={generateBackingTrackSearch}
            className="find-backing-track-button"
            title={`Search for ${note.selectedNote || ''} ${chordProgression.keyType} ${chordProgression.selectedStyle} backing tracks`}
          >
            🎵 Find
          </button>
        </div>
      )}
    </div>
  );
};