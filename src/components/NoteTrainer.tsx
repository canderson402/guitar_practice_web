import React, { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { useAudibleBeat, useTransport } from '../audio';
import type { TickEvent } from '../audio';
import { Select, Chip, Checkbox } from '../ui';
import './NoteTrainer.css';

export const NoteTrainer: React.FC = () => {
  const selectedNote = useStore(s => s.note.selectedNote);
  const note = { selectedNote };
  const metronomeOn = useStore(s => s.metronome.isPlaying);
  const timer = useStore(useShallow(s => ({
    isRunning: s.timer.isRunning,
    elapsedSeconds: s.timer.elapsedSeconds,
  })));
  const circleOfFifths = useStore(s => s.circleOfFifths);
  const {
    setSelectedNote,
    setCircleAutoAdvance,
    setCircleDirection,
    setCircleChangeMode,
    setCircleChangeInterval,
    setCircleRandomize,
    setCircleShowNext,
    setCircleNextNote,
    setCircleCountIn
  } = useStore(useShallow(s => ({
    setSelectedNote: s.setSelectedNote,
    setCircleAutoAdvance: s.setCircleAutoAdvance,
    setCircleDirection: s.setCircleDirection,
    setCircleChangeMode: s.setCircleChangeMode,
    setCircleChangeInterval: s.setCircleChangeInterval,
    setCircleRandomize: s.setCircleRandomize,
    setCircleShowNext: s.setCircleShowNext,
    setCircleNextNote: s.setCircleNextNote,
    setCircleCountIn: s.setCircleCountIn,
  })));

  // Time-mode tracking (beat/bar modes count from the transport instead).
  const lastChangeTimeRef = useRef(0);

  // Heard transport position — only subscribed while a beat-driven mode is
  // active, so the card doesn't re-render per beat otherwise.
  const beatDriven = circleOfFifths.autoAdvance && metronomeOn &&
    (circleOfFifths.changeMode === 'bars' || circleOfFifths.changeMode === 'beats');
  const pos = useTransport(useShallow(s => beatDriven
    ? { beatCount: s.beatCount, barIndex: s.barIndex, beatInBar: s.beatInBar, beatsPerBar: s.beatsPerBar }
    : null));

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
    
    if (circleOfFifths.changeMode === 'bars' && pos) {
      // Counted from the transport: bar b of the cycle is b % interval.
      const barInCycle = pos.beatCount < 0 ? 0 : pos.barIndex % circleOfFifths.changeInterval;
      const barsRemaining = circleOfFifths.changeInterval - barInCycle;

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
    } else if (circleOfFifths.changeMode === 'beats' && pos) {
      const heard = Math.max(pos.beatCount, 0);
      // Count-in: the first `countIn` transport beats.
      if (heard < circleOfFifths.countIn) {
        return {
          type: 'count-in',
          value: circleOfFifths.countIn - heard,
          total: circleOfFifths.countIn
        };
      }

      const musicBeat = heard - circleOfFifths.countIn;
      return {
        type: 'beats',
        value: circleOfFifths.changeInterval - (musicBeat % circleOfFifths.changeInterval),
        total: circleOfFifths.changeInterval
      };
    }
    
    return null;
  };
  
  const countdown = getCountdown();
  
  // No longer need this effect since autoAdvance is controlled manually
  
  const advance = () => {
    const next = useStore.getState().circleOfFifths.nextNote;
    if (!next) return;
    setSelectedNote(next);
    setCircleNextNote(generateNextNote(next));
  };

  // Bar / beat modes: driven by the transport's heard beats, counted from
  // its start — never missed or doubled.
  //   bars:  change on the downbeat starting every Nth bar
  //   beats: after `countIn` beats, change every N beats
  useAudibleBeat((ev: TickEvent) => {
    const c = useStore.getState().circleOfFifths;
    if (!c.autoAdvance) return;
    if (c.changeMode === 'bars') {
      if (ev.beatInBar === 0 && ev.barIndex > 0 && ev.barIndex % c.changeInterval === 0) advance();
    } else if (c.changeMode === 'beats') {
      const musicBeat = ev.beatCount - c.countIn;
      if (musicBeat > 0 && musicBeat % c.changeInterval === 0) advance();
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

  // Time mode: change every N seconds of the practice timer.
  useEffect(() => {
    if (!circleOfFifths.autoAdvance || !note.selectedNote) return;
    if (circleOfFifths.changeMode !== 'time' || !timer.isRunning) return;
    const currentTime = timer.elapsedSeconds;
    if (currentTime > 0 && currentTime - lastChangeTimeRef.current >= circleOfFifths.changeInterval) {
      advance();
      lastChangeTimeRef.current = currentTime;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    circleOfFifths.autoAdvance,
    circleOfFifths.changeMode,
    circleOfFifths.changeInterval,
    timer.isRunning,
    timer.elapsedSeconds,
    note.selectedNote,
  ]);


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
            <Select
              size="sm"
              value={circleOfFifths.changeMode}
              onChange={(e) => setCircleChangeMode(e.target.value as 'none' | 'bars' | 'time' | 'beats')}
              disabled={!circleOfFifths.autoAdvance}
              options={[
                { value: 'bars', label: 'Bars' },
                { value: 'time', label: 'Seconds' },
                { value: 'beats', label: 'Beats' },
              ]}
            />
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
                <Chip
                  active={circleOfFifths.changeInterval === 11}
                  onClick={() => setCircleChangeInterval(11)}
                  disabled={!circleOfFifths.autoAdvance}
                  title="One string (11 beats)"
                >
                  11
                </Chip>
                <Chip
                  active={circleOfFifths.changeInterval === 6}
                  onClick={() => setCircleChangeInterval(6)}
                  disabled={!circleOfFifths.autoAdvance}
                  title="One position (6 beats)"
                >
                  6
                </Chip>
              </div>
            </div>
          </div>

          <div className="control-compact">
            <label>Count-in:</label>
            <Select
              size="sm"
              value={circleOfFifths.countIn}
              onChange={(e) => setCircleCountIn(parseInt(e.target.value))}
              disabled={!circleOfFifths.autoAdvance}
              options={[
                { value: '0', label: 'None' },
                { value: '1', label: '1 beat' },
                { value: '2', label: '2 beats' },
                { value: '4', label: '4 beats' },
                { value: '8', label: '8 beats' },
              ]}
            />
          </div>

          <div className="control-compact">
            <label>Direction:</label>
            <Select
              size="sm"
              value={circleOfFifths.direction}
              onChange={(e) => setCircleDirection(e.target.value as 'clockwise' | 'counterclockwise')}
              disabled={!circleOfFifths.autoAdvance || circleOfFifths.randomize}
              options={[
                { value: 'clockwise', label: 'Fifths →' },
                { value: 'counterclockwise', label: '← Fourths' },
              ]}
            />
          </div>
        </div>

        {/* Options Row */}
        <div className="option-controls">
          <Checkbox
            checked={circleOfFifths.randomize}
            onCheckedChange={setCircleRandomize}
            disabled={!circleOfFifths.autoAdvance}
            label="Random"
          />
          <Checkbox
            checked={circleOfFifths.showNext}
            onCheckedChange={setCircleShowNext}
            label="Show Next"
          />
        </div>
      </div>
    </div>
  );
};