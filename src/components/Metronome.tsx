import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import './Metronome.css';

export const Metronome: React.FC = () => {
  const { metronome, setMetronomePlaying, setBpm, setCurrentBeat, setBeatsPerMeasure, setSubdivision, setEmphasizeFirstBeat } = useStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const playClick = (isAccent: boolean, isFirstBeat: boolean) => {
    if (!audioContextRef.current) return;
    
    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    // More metronome-like frequencies - higher pitched and crisp
    if (metronome.emphasizeFirstBeat && isFirstBeat) {
      // First beat of measure - higher pitch for emphasis
      osc.frequency.value = 1760; // High A
    } else if (isAccent) {
      // Downbeats - medium high pitch
      osc.frequency.value = 1320; // E above high C
    } else {
      // Off-beats - slightly lower but still crisp
      osc.frequency.value = 1056; // C above high C
    }
    
    // Adjust volume and make it more crisp
    gainNode.gain.value = isFirstBeat && metronome.emphasizeFirstBeat ? 0.4 : 0.3;
    
    const now = audioContextRef.current.currentTime;
    osc.start(now);
    // Sharper attack and quicker decay for more metronome-like sound
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    osc.stop(now + 0.02);
  };
  
  useEffect(() => {
    if (metronome.isPlaying) {
      // Calculate timing based on subdivision
      const getTimingInfo = () => {
        let notesPerBeat: number;
        let noteValue: string;
        
        switch (metronome.subdivision) {
          case 'quarter':
            notesPerBeat = 1;
            noteValue = 'quarter notes';
            break;
          case 'eighth':
            notesPerBeat = 2;
            noteValue = 'eighth notes';
            break;
          case 'sixteenth':
            notesPerBeat = 4;
            noteValue = 'sixteenth notes';
            break;
          case 'eighthTriplet':
            // 3 eighth notes in space of 2 eighth notes (1 beat)
            notesPerBeat = 3;
            noteValue = 'eighth note triplets';
            break;
          case 'sixteenthTriplet':
            // 3 sixteenth notes in space of 2 sixteenth notes (1/2 beat)
            // So per beat: 3 × 2 = 6 notes per beat
            notesPerBeat = 6;
            noteValue = 'sixteenth note triplets';
            break;
          default:
            notesPerBeat = 1;
            noteValue = 'quarter notes';
        }
        
        // Calculate interval between clicks
        const beatsPerMinute = metronome.bpm;
        const millisecondsPerBeat = 60000 / beatsPerMinute;
        const intervalBetweenClicks = millisecondsPerBeat / notesPerBeat;
        
        return {
          notesPerBeat,
          intervalBetweenClicks,
          noteValue
        };
      };
      
      const { notesPerBeat, intervalBetweenClicks } = getTimingInfo();
      let beat = 0;
      let subdivisionCount = 0;
      
      const tick = () => {
        // Accent on downbeats (first subdivision of each beat)
        const isAccent = subdivisionCount === 0;
        // First beat of the measure (beat 0)
        const isFirstBeat = beat === 0 && subdivisionCount === 0;
        playClick(isAccent, isFirstBeat);
        
        // Update beat display only on quarter note beats (every notesPerBeat clicks)
        if (subdivisionCount === 0) {
          setCurrentBeat(beat);
        }
        
        subdivisionCount = (subdivisionCount + 1) % notesPerBeat;
        if (subdivisionCount === 0) {
          beat = (beat + 1) % metronome.beatsPerMeasure;
        }
      };
      
      tick();
      intervalRef.current = setInterval(tick, intervalBetweenClicks);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentBeat(0);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [metronome.isPlaying, metronome.bpm, metronome.beatsPerMeasure, metronome.subdivision, metronome.emphasizeFirstBeat, setCurrentBeat]);
  
  const handleBpmChange = (delta: number) => {
    const newBpm = Math.max(40, Math.min(300, metronome.bpm + delta));
    setBpm(newBpm);
  };
  
  return (
    <div className="metronome">
      <div className="beat-indicators">
        {Array.from({ length: metronome.beatsPerMeasure }, (_, i) => (
          <div
            key={i}
            className={`beat-dot ${i === metronome.currentBeat ? 'active' : ''} ${i === 0 ? 'accent' : ''}`}
          />
        ))}
      </div>
      
      <div className="bpm-control">
        <button onClick={() => handleBpmChange(-5)} className="bpm-button">−5</button>
        <button onClick={() => handleBpmChange(-1)} className="bpm-button">−1</button>
        <div className="bpm-display">
          <span className="bpm-value">{metronome.bpm}</span>
          <span className="bpm-label">BPM</span>
        </div>
        <button onClick={() => handleBpmChange(1)} className="bpm-button">+1</button>
        <button onClick={() => handleBpmChange(5)} className="bpm-button">+5</button>
      </div>
      
      <div className="time-signature">
        <label>Time Signature:</label>
        <select 
          value={metronome.beatsPerMeasure} 
          onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
          className="time-signature-select"
        >
          <option value={2}>2/4</option>
          <option value={3}>3/4</option>
          <option value={4}>4/4</option>
          <option value={5}>5/4</option>
          <option value={6}>6/8</option>
          <option value={7}>7/8</option>
        </select>
      </div>
      
      <div className="emphasis-control">
        <label className="emphasis-checkbox">
          <input
            type="checkbox"
            checked={metronome.emphasizeFirstBeat}
            onChange={(e) => setEmphasizeFirstBeat(e.target.checked)}
          />
          Emphasize First Beat
        </label>
      </div>
      
      <div className="subdivision-control">
        <div className="subdivision-icons">
          <button
            className={`subdivision-icon ${metronome.subdivision === 'quarter' ? 'active' : ''}`}
            onClick={() => setSubdivision('quarter')}
            title="Quarter notes"
          >
            ♩
          </button>
          <button
            className={`subdivision-icon ${metronome.subdivision === 'eighth' ? 'active' : ''}`}
            onClick={() => setSubdivision('eighth')}
            title="Eighth notes"
          >
            ♫
          </button>
          <button
            className={`subdivision-icon ${metronome.subdivision === 'sixteenth' ? 'active' : ''}`}
            onClick={() => setSubdivision('sixteenth')}
            title="Sixteenth notes"
          >
            ♬
          </button>
          <button
            className={`subdivision-icon ${metronome.subdivision === 'eighthTriplet' ? 'active' : ''}`}
            onClick={() => setSubdivision('eighthTriplet')}
            title="Eighth note triplets"
          >
            ♫₃
          </button>
          <button
            className={`subdivision-icon ${metronome.subdivision === 'sixteenthTriplet' ? 'active' : ''}`}
            onClick={() => setSubdivision('sixteenthTriplet')}
            title="Sixteenth note triplets"
          >
            ♬₃
          </button>
        </div>
      </div>
      
      <button 
        onClick={() => setMetronomePlaying(!metronome.isPlaying)}
        className={`play-button ${metronome.isPlaying ? 'playing' : ''}`}
      >
        {metronome.isPlaying ? 'Stop' : 'Start'}
      </button>
    </div>
  );
};