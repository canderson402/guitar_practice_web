import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Button, ToggleButtonGroup } from '../ui';
import './Timer.css';

export const Timer: React.FC = () => {
  const { timer, setTimerRunning, setElapsedSeconds, setTimerMode, setTargetSeconds } = useStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (timer.isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(
          timer.mode === 'countUp' 
            ? timer.elapsedSeconds + 1
            : Math.max(0, timer.elapsedSeconds - 1)
        );
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isRunning, timer.mode, timer.elapsedSeconds, setElapsedSeconds]);
  
  useEffect(() => {
    if (timer.mode === 'countDown' && timer.elapsedSeconds === 0 && timer.isRunning) {
      setTimerRunning(false);
    }
  }, [timer.elapsedSeconds, timer.mode, timer.isRunning, setTimerRunning]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleReset = () => {
    setTimerRunning(false);
    setElapsedSeconds(timer.mode === 'countDown' ? timer.targetSeconds : 0);
  };
  
  const handleTargetMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value) || 0;
    const newTarget = minutes * 60;
    setTargetSeconds(newTarget);
    if (timer.mode === 'countDown' && !timer.isRunning) {
      setElapsedSeconds(newTarget);
    }
  };
  
  const handleModeChange = (mode: 'countUp' | 'countDown') => {
    setTimerMode(mode);
    setTimerRunning(false);
    setElapsedSeconds(mode === 'countDown' ? timer.targetSeconds : 0);
  };
  
  const displaySeconds = timer.elapsedSeconds;
  
  return (
    <div className="timer">
      <div className="timer-display">
        {formatTime(displaySeconds)}
      </div>
      
      <ToggleButtonGroup label="Timer mode" layout="segmented">
        <Button
          variant="ghost"
          active={timer.mode === 'countUp'}
          onClick={() => handleModeChange('countUp')}
        >
          Count Up
        </Button>
        <Button
          variant="ghost"
          active={timer.mode === 'countDown'}
          onClick={() => handleModeChange('countDown')}
        >
          Count Down
        </Button>
      </ToggleButtonGroup>

      {timer.mode === 'countDown' && (
        <div className="target-time">
          <label className="ds-label-inline">Target (min):</label>
          <input
            type="number"
            min="1"
            max="999"
            value={Math.floor(timer.targetSeconds / 60)}
            onChange={handleTargetMinutesChange}
            disabled={timer.isRunning}
            className="ds-input ds-input-number"
          />
        </div>
      )}

      <div className="timer-controls">
        <Button
          variant={timer.isRunning ? 'danger' : 'primary'}
          onClick={() => setTimerRunning(!timer.isRunning)}
        >
          {timer.isRunning ? 'Stop' : 'Start'}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
};