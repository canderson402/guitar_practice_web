import React, { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { Button, ToggleButtonGroup } from '../ui';
import './Timer.css';

export const Timer: React.FC = () => {
  const timer = useStore(s => s.timer);
  const { setTimerRunning, setElapsedSeconds, setTimerMode, setTargetSeconds } = useStore(useShallow(s => ({
    setTimerRunning: s.setTimerRunning,
    setElapsedSeconds: s.setElapsedSeconds,
    setTimerMode: s.setTimerMode,
    setTargetSeconds: s.setTargetSeconds,
  })));

  // Elapsed time is computed from a performance.now() anchor taken at start,
  // not by adding 1 per interval — so it can't drift, and it catches up
  // correctly after background-tab throttling. The interval only decides
  // how often we check; it re-anchors only on start/stop/mode change.
  useEffect(() => {
    if (!timer.isRunning) return;
    const anchorMs = performance.now();
    const anchorSeconds = useStore.getState().timer.elapsedSeconds;
    const countUp = timer.mode === 'countUp';
    const id = setInterval(() => {
      const passed = Math.floor((performance.now() - anchorMs) / 1000);
      const next = countUp ? anchorSeconds + passed : Math.max(0, anchorSeconds - passed);
      if (next !== useStore.getState().timer.elapsedSeconds) setElapsedSeconds(next);
    }, 200);
    return () => clearInterval(id);
  }, [timer.isRunning, timer.mode, setElapsedSeconds]);

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