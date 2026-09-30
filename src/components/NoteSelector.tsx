import React, { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { useAudibleBeat, useTransport } from '../audio';
import { notes, scales, getScaleNotes, getChromaticScale } from '../data/musicData';
import { Select, Button } from '../ui';
import './NoteSelector.css';

export const NoteSelector: React.FC = () => {
  const note = useStore(s => s.note);
  const timer = useStore(useShallow(s => ({
    isRunning: s.timer.isRunning,
    elapsedSeconds: s.timer.elapsedSeconds,
  })));
  const metronomeOn = useStore(s => s.metronome.isPlaying);
  const {
    setSelectedNote,
    setSelectedScale,
    setCurrentNoteIndex,
    setNextNoteIndex
  } = useStore(useShallow(s => ({
    setSelectedNote: s.setSelectedNote,
    setSelectedScale: s.setSelectedScale,
    setCurrentNoteIndex: s.setCurrentNoteIndex,
    setNextNoteIndex: s.setNextNoteIndex,
  })));

  const lastChangeTimeRef = useRef(0);

  // Heard transport position — only subscribed while bar-mode auto-advance
  // is active, so the card doesn't re-render per beat otherwise.
  const barsActive = note.changeMode === 'bars' && metronomeOn;
  const pos = useTransport(useShallow(s => barsActive
    ? { beatCount: s.beatCount, barIndex: s.barIndex, beatInBar: s.beatInBar, beatsPerBar: s.beatsPerBar }
    : null));
  
  // Validate selected scale and reset if invalid
  useEffect(() => {
    if (note.selectedScale && !scales[note.selectedScale as keyof typeof scales]) {
      setSelectedScale('Major (Ionian)');
    }
  }, [note.selectedScale, setSelectedScale]);
  
  const currentNotes = note.selectedScale && note.selectedNote
    ? getScaleNotes(note.selectedNote, note.selectedScale as keyof typeof scales)
    : note.selectedNote
    ? getChromaticScale(note.selectedNote) // Use reordered chromatic scale starting from root
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
    const intervals = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
    
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
      { number: '♯4', quality: 'Augmented', name: 'Fourth' },
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
    
    if (barsActive && pos) {
      // Counted from the transport: bar b of the cycle is b % interval.
      const barInCycle = pos.beatCount < 0 ? 0 : pos.barIndex % note.changeInterval;
      const barsRemaining = note.changeInterval - barInCycle;

      // If we're on the last bar, show beats remaining instead
      if (barsRemaining === 1 && pos.beatCount >= 0) {
        return {
          type: 'beats',
          value: pos.beatsPerBar - pos.beatInBar,
          total: pos.beatsPerBar
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

  // Bar mode: change note on the downbeat that starts every Nth bar. Driven
  // by the transport's heard beats (counted, never missed or doubled).
  useAudibleBeat(ev => {
    const { note: n } = useStore.getState();
    if (n.changeMode !== 'bars' || currentNotes.length <= 1) return;
    if (ev.beatInBar === 0 && ev.barIndex > 0 && ev.barIndex % n.changeInterval === 0) {
      setCurrentNoteIndex(n.nextNoteIndex);
    }
  });

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
    
    if (note.changeMode === 'time' && timer.isRunning) {
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
    note.changeMode,
    note.changeInterval,
    note.nextNoteIndex,
    note.autoAdvanceEnabled,
    currentNotes.length,
    setCurrentNoteIndex
  ]);
  
  
  const handleNoteChange = (newNote: string | null) => {
    setSelectedNote(newNote);
    // When switching to single note mode, start from the selected note's index
    if (newNote && !note.selectedScale) {
      // Always start at index 0 since chromatic scale now starts from root
      setCurrentNoteIndex(0);
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
  
  
  return (
    <div className="note-selector">
      <div className="top-controls">
        <div className="selection-controls">
          <Select
            label="Root Note"
            value={note.selectedNote || ''}
            onChange={(e) => handleNoteChange(e.target.value || null)}
          >
            <option value="">Select a note</option>
            {notes.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>

          <Select
            label="Scale"
            value={note.selectedScale || ''}
            onChange={(e) => handleScaleChange(e.target.value || null)}
          >
            <option value="">Chromatic</option>
            {Object.keys(scales).map(scale => (
              <option key={scale} value={scale}>{scale}</option>
            ))}
          </Select>
        </div>
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
                    {(note.selectedScale ? currentNotes : (note.selectedNote ? getChromaticScale(note.selectedNote) : notes)).map((n, i) => {
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
                              const chromaticNotes = note.selectedNote ? getChromaticScale(note.selectedNote) : notes;
                              const noteIndex = chromaticNotes.indexOf(n);
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
                  <div className="scale-controls-below">
                    <Button variant="secondary" onClick={handleNext}>
                      Next Note
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};