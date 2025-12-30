import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import './NoteTrainer.css';

export const NoteTrainer: React.FC = () => {
  const { 
    note, 
    metronome, 
    timer, 
    circleOfFifths, 
    setSelectedNote,
    setCircleAutoAdvance,
    setCircleDirection,
    setCircleChangeMode,
    setCircleChangeInterval,
    setCircleRandomize,
    setCircleShowNext,
    setCircleNextNote,
    setCircleCountIn
  } = useStore();
  
  // Auto-advance tracking
  const barCountRef = useRef(0);
  const beatCountRef = useRef(0);
  const lastChangeTimeRef = useRef(0);
  const wasOnFirstBeatRef = useRef(false);
  const lastBeatRef = useRef(-1);
  const countInBeatRef = useRef(0);
  const isCountingInRef = useRef(false);
  const [, forceUpdate] = useState({});

  // Circle of Fifths in order (starting from C at 12 o'clock)
  const circleOfFifthsNotes = [
    'C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'
  ];
  
  // Generate the next note based on direction and randomization
  const generateNextNote = (currentNote: string) => {
    const currentIndex = circleOfFifthsNotes.indexOf(currentNote);
    if (currentIndex === -1) return currentNote;
    
    if (circleOfFifths.randomize) {
      // Generate random index different from current
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * 12);
      } while (randomIndex === currentIndex);
      return circleOfFifthsNotes[randomIndex];
    } else {
      if (circleOfFifths.direction === 'clockwise') {
        // Move clockwise (by fifths)
        return circleOfFifthsNotes[(currentIndex + 1) % 12];
      } else {
        // Move counterclockwise (by fourths)
        return circleOfFifthsNotes[(currentIndex - 1 + 12) % 12];
      }
    }
  };
  
  // Update next note when current note or settings change
  useEffect(() => {
    if (note.selectedNote) {
      const nextNote = generateNextNote(note.selectedNote);
      setCircleNextNote(nextNote);
    }
  }, [note.selectedNote, circleOfFifths.direction, circleOfFifths.randomize, setCircleNextNote]);
  
  // Calculate countdown to next note
  const getCountdown = () => {
    if (!circleOfFifths.autoAdvance) return null;
    
    if (circleOfFifths.changeMode === 'bars' && metronome.isPlaying) {
      const currentBar = barCountRef.current;
      const nextChangeBar = Math.ceil((currentBar + 1) / circleOfFifths.changeInterval) * circleOfFifths.changeInterval;
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
        total: circleOfFifths.changeInterval
      };
    } else if (circleOfFifths.changeMode === 'time' && timer.isRunning) {
      // Calculate remaining time in current interval
      const currentCycle = Math.floor(timer.elapsedSeconds / circleOfFifths.changeInterval);
      const nextChangeTime = (currentCycle + 1) * circleOfFifths.changeInterval;
      const timeRemaining = nextChangeTime - timer.elapsedSeconds;
      
      return {
        type: 'seconds',
        value: Math.max(0, Math.ceil(timeRemaining)),
        total: circleOfFifths.changeInterval
      };
    } else if (circleOfFifths.changeMode === 'beats' && metronome.isPlaying) {
      // If still counting in, show count-in countdown
      if (isCountingInRef.current) {
        const countInRemaining = circleOfFifths.countIn - countInBeatRef.current;
        return {
          type: 'count-in',
          value: countInRemaining,
          total: circleOfFifths.countIn
        };
      }
      
      const currentBeat = beatCountRef.current;
      const nextChangeBeat = Math.ceil((currentBeat + 1) / circleOfFifths.changeInterval) * circleOfFifths.changeInterval;
      const beatsRemaining = nextChangeBeat - currentBeat;
      
      return {
        type: 'beats',
        value: beatsRemaining,
        total: circleOfFifths.changeInterval
      };
    }
    
    return null;
  };
  
  const countdown = getCountdown();
  
  // No longer need this effect since autoAdvance is controlled manually
  
  // Reset counters when metronome stops
  useEffect(() => {
    if (!metronome.isPlaying) {
      barCountRef.current = 0;
      beatCountRef.current = 0;
      wasOnFirstBeatRef.current = false;
      lastBeatRef.current = -1;
      countInBeatRef.current = 0;
      isCountingInRef.current = false;
    }
  }, [metronome.isPlaying]);

  // Initialize beat tracking when metronome starts
  useEffect(() => {
    if (metronome.isPlaying && lastBeatRef.current === -1) {
      // First time starting - set to current beat to avoid immediate increment
      lastBeatRef.current = metronome.currentBeat;
      // Start count-in if enabled
      if (circleOfFifths.countIn > 0 && circleOfFifths.autoAdvance) {
        isCountingInRef.current = true;
        countInBeatRef.current = 0;
      }
    }
  }, [metronome.isPlaying, metronome.currentBeat, circleOfFifths.countIn, circleOfFifths.autoAdvance]);
  
  useEffect(() => {
    if (!timer.isRunning) {
      lastChangeTimeRef.current = 0;
    } else if (timer.elapsedSeconds === 0) {
      // Reset to 0 when timer starts fresh
      lastChangeTimeRef.current = 0;
    }
  }, [timer.isRunning, timer.elapsedSeconds]);
  
  // Auto-advance logic
  useEffect(() => {
    if (!circleOfFifths.autoAdvance || !note.selectedNote) return;
    
    if (circleOfFifths.changeMode === 'bars' && metronome.isPlaying) {
      const isFirstBeat = metronome.currentBeat === 0;
      
      // Detect transition to first beat
      if (isFirstBeat && !wasOnFirstBeatRef.current) {
        barCountRef.current += 1;
        
        // Change note every X bars
        if (barCountRef.current % circleOfFifths.changeInterval === 0) {
          if (circleOfFifths.nextNote) {
            setSelectedNote(circleOfFifths.nextNote);
            // Generate new next note
            const newNextNote = generateNextNote(circleOfFifths.nextNote);
            setCircleNextNote(newNextNote);
          }
        }
      }
      
      wasOnFirstBeatRef.current = isFirstBeat;
    } else if (circleOfFifths.changeMode === 'time' && timer.isRunning) {
      const currentTime = timer.elapsedSeconds;
      
      if (currentTime > 0 && currentTime - lastChangeTimeRef.current >= circleOfFifths.changeInterval) {
        if (circleOfFifths.nextNote) {
          setSelectedNote(circleOfFifths.nextNote);
          // Generate new next note
          const newNextNote = generateNextNote(circleOfFifths.nextNote);
          setCircleNextNote(newNextNote);
        }
        lastChangeTimeRef.current = currentTime;
      }
    } else if (circleOfFifths.changeMode === 'beats' && metronome.isPlaying) {
      // Simple beat counting - increment on any beat change
      if (metronome.currentBeat !== lastBeatRef.current) {
        lastBeatRef.current = metronome.currentBeat;
        
        // Handle count-in first
        if (isCountingInRef.current) {
          countInBeatRef.current += 1;
          if (countInBeatRef.current >= circleOfFifths.countIn) {
            // Count-in finished, start actual counting
            isCountingInRef.current = false;
            beatCountRef.current = 0;
          }
        } else {
          // Normal beat counting
          beatCountRef.current += 1;
          
          // Change note when we reach the target beat count
          if (beatCountRef.current >= circleOfFifths.changeInterval) {
            if (circleOfFifths.nextNote) {
              setSelectedNote(circleOfFifths.nextNote);
              // Generate new next note
              const newNextNote = generateNextNote(circleOfFifths.nextNote);
              setCircleNextNote(newNextNote);
            }
            beatCountRef.current = 0; // Reset counter
          }
        }
      }
    }
  }, [
    circleOfFifths.autoAdvance,
    circleOfFifths.changeMode,
    circleOfFifths.changeInterval,
    circleOfFifths.direction,
    metronome.currentBeat,
    metronome.isPlaying,
    timer.isRunning,
    timer.elapsedSeconds,
    note.selectedNote,
    setSelectedNote
  ]);
  
  // Force re-render for countdown updates
  useEffect(() => {
    const isActive = circleOfFifths.autoAdvance && (
      (circleOfFifths.changeMode === 'bars' && metronome.isPlaying) || 
      (circleOfFifths.changeMode === 'time' && timer.isRunning) ||
      (circleOfFifths.changeMode === 'beats' && metronome.isPlaying)
    );
    
    if (!isActive) return;
    
    const interval = setInterval(() => {
      forceUpdate({}); // Force re-render to update countdown
    }, 200); // Update every 200ms for smooth countdown
    
    return () => clearInterval(interval);
  }, [circleOfFifths.autoAdvance, circleOfFifths.changeMode, metronome.isPlaying, timer.isRunning]);

  return (
    <div className={`note-trainer ${!circleOfFifths.autoAdvance ? 'disabled' : ''}`}>
      {/* Activation Toggle */}
      <div className="activation-toggle">
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={circleOfFifths.autoAdvance}
            onChange={(e) => setCircleAutoAdvance(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">Activate</span>
        </label>
      </div>
      
      {/* Primary Focus: Large Note Display */}
      <div className="large-note-display">
        <div className="notes-row">
          <div className="current-note-large">
            <div className="note-label-large">CURRENT</div>
            <div className="note-value-large">{note.selectedNote || 'C'}</div>
          </div>
          {circleOfFifths.showNext && (
            <>
              <div className="arrow-container">
                <div className="arrow">→</div>
              </div>
              <div className="next-note-large">
                <div className="note-label-large">NEXT</div>
                <div className="note-value-large">{circleOfFifths.nextNote || 'G'}</div>
              </div>
            </>
          )}
        </div>
        {circleOfFifths.showNext && (
          <div className="countdown-info">
            {countdown && circleOfFifths.autoAdvance ? (
              countdown.type === 'count-in' ? (
                <span>Count-in: {countdown.value}</span>
              ) : (
                <span>
                  Next in: {countdown.value} {countdown.type === 'bars' ? 
                    (countdown.value === 1 ? 'bar' : 'bars') : 
                  countdown.type === 'beats' ?
                    (countdown.value === 1 ? 'beat' : 'beats') :
                    (countdown.value === 1 ? 'sec' : 'secs')
                  }
                </span>
              )
            ) : 'Next in: —'}
          </div>
        )}
      </div>
      
      {/* Compact Controls */}
      <div className="trainer-controls">
        {/* Main Settings Row */}
        <div className="main-controls">
          <div className="control-compact">
            <label>Mode:</label>
            <select 
              value={circleOfFifths.changeMode} 
              onChange={(e) => setCircleChangeMode(e.target.value as 'none' | 'bars' | 'time' | 'beats')}
              className="select-compact"
              disabled={!circleOfFifths.autoAdvance}
            >
              <option value="bars">Bars</option>
              <option value="time">Seconds</option>
              <option value="beats">Beats</option>
            </select>
          </div>
          
          <div className="control-compact">
            <label>Every:</label>
            <div className="interval-input-group">
              <input
                type="number"
                min="1"
                max={circleOfFifths.changeMode === 'beats' ? '48' : '16'}
                value={circleOfFifths.changeInterval}
                onChange={(e) => setCircleChangeInterval(parseInt(e.target.value) || 1)}
                className="number-compact"
                disabled={!circleOfFifths.autoAdvance}
              />
              <div className="interval-presets">
                <button
                  className={`preset-btn ${circleOfFifths.changeInterval === 11 ? 'active' : ''}`}
                  onClick={() => setCircleChangeInterval(11)}
                  disabled={!circleOfFifths.autoAdvance}
                  title="One string (11 beats)"
                >
                  11
                </button>
                <button
                  className={`preset-btn ${circleOfFifths.changeInterval === 6 ? 'active' : ''}`}
                  onClick={() => setCircleChangeInterval(6)}
                  disabled={!circleOfFifths.autoAdvance}
                  title="One position (6 beats)"
                >
                  6
                </button>
              </div>
            </div>
          </div>
          
          <div className="control-compact">
            <label>Count-in:</label>
            <select 
              value={circleOfFifths.countIn} 
              onChange={(e) => setCircleCountIn(parseInt(e.target.value))}
              className="select-compact"
              disabled={!circleOfFifths.autoAdvance}
            >
              <option value="0">None</option>
              <option value="1">1 beat</option>
              <option value="2">2 beats</option>
              <option value="4">4 beats</option>
              <option value="8">8 beats</option>
            </select>
          </div>
          
          <div className="control-compact">
            <label>Direction:</label>
            <select 
              value={circleOfFifths.direction} 
              onChange={(e) => setCircleDirection(e.target.value as 'clockwise' | 'counterclockwise')}
              className="select-compact"
              disabled={!circleOfFifths.autoAdvance || circleOfFifths.randomize}
            >
              <option value="clockwise">Fifths →</option>
              <option value="counterclockwise">← Fourths</option>
            </select>
          </div>
        </div>
        
        {/* Options Row */}
        <div className="option-controls">
          <label className="checkbox-compact">
            <input 
              type="checkbox" 
              checked={circleOfFifths.randomize}
              onChange={(e) => setCircleRandomize(e.target.checked)}
              disabled={!circleOfFifths.autoAdvance}
            />
            <span>Random</span>
          </label>
          
          <label className="checkbox-compact">
            <input 
              type="checkbox" 
              checked={circleOfFifths.showNext}
              onChange={(e) => setCircleShowNext(e.target.checked)}
            />
            <span>Show Next</span>
          </label>
        </div>
      </div>
    </div>
  );
};