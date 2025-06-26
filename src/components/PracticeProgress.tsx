import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import './PracticeProgress.css';

export const PracticeProgress: React.FC = () => {
  const { 
    timer,
    metronome,
    note,
  } = useStore();
  
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [totalNoteChanges, setTotalNoteChanges] = useState(0);
  const [lastNoteIndex, setLastNoteIndex] = useState(note.currentNoteIndex);
  const [barsCompleted, setBarsCompleted] = useState(0);
  const [lastBeat, setLastBeat] = useState(metronome.currentBeat);
  
  // Track session start/stop and accumulate time
  useEffect(() => {
    const isActive = timer.isRunning || metronome.isPlaying;
    
    if (isActive && !sessionStartTime) {
      // Starting a session
      setSessionStartTime(Date.now());
    } else if (!isActive && sessionStartTime) {
      // Stopping a session - accumulate the time
      const elapsedTime = Math.floor((Date.now() - sessionStartTime) / 1000);
      setTotalSessionTime(prev => prev + elapsedTime);
      setSessionStartTime(null);
    }
  }, [timer.isRunning, metronome.isPlaying, sessionStartTime]);
  
  // Track note changes
  useEffect(() => {
    if (note.currentNoteIndex !== lastNoteIndex) {
      setTotalNoteChanges(prev => prev + 1);
      setLastNoteIndex(note.currentNoteIndex);
    }
  }, [note.currentNoteIndex, lastNoteIndex]);
  
  // Track bars completed
  useEffect(() => {
    if (metronome.isPlaying && metronome.currentBeat === 0 && lastBeat !== 0) {
      setBarsCompleted(prev => prev + 1);
    }
    setLastBeat(metronome.currentBeat);
  }, [metronome.currentBeat, metronome.isPlaying, lastBeat]);
  
  // Calculate session duration
  const getSessionDuration = () => {
    let currentSessionTime = totalSessionTime;
    if (sessionStartTime) {
      // Add current active session time
      currentSessionTime += Math.floor((Date.now() - sessionStartTime) / 1000);
    }
    return currentSessionTime;
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get current tempo description
  const getTempoDescription = () => {
    if (metronome.bpm < 60) return 'Very Slow';
    if (metronome.bpm < 80) return 'Slow';
    if (metronome.bpm <= 120) return 'Moderate';
    if (metronome.bpm < 140) return 'Fast';
    return 'Very Fast';
  };
  
  // Calculate estimated notes per minute
  const getNotesPerMinute = () => {
    const sessionMinutes = getSessionDuration() / 60;
    if (sessionMinutes < 1) return 0;
    return Math.round(totalNoteChanges / sessionMinutes);
  };
  
  const sessionDuration = getSessionDuration();
  const isActive = timer.isRunning || metronome.isPlaying;
  
  return (
    <div className="practice-progress">
      <div className="session-overview">
        <div className="session-status">
          <div className={`status-indicator ${isActive ? 'active' : 'inactive'}`} />
          <span className="status-text">
            {isActive ? 'Practicing' : 'Paused'}
          </span>
        </div>
        
        <div className="session-time">
          <div className="time-value">{formatTime(sessionDuration)}</div>
          <div className="time-label">Session Time</div>
        </div>
      </div>
      <div className="tempo-info">
        <div className="tempo-display">
          <div className="tempo-value">{metronome.bpm}</div>
          <div className="tempo-label">BPM</div>
        </div>
        <div className="tempo-description">{getTempoDescription()}</div>
        <div className="time-signature">{metronome.beatsPerMeasure}/4</div>
      </div>
    </div>
  );
};