import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { scheduleClick, loadClickSamples, getAudioContext } from '../audio';
import { Button, Select, Checkbox, ToggleButtonGroup } from '../ui';
import './Metronome.css';

export const Metronome: React.FC = () => {
  const { metronome, jam, setMetronomePlaying, setBpm, setCurrentBeat, setBeatsPerMeasure, setSubdivision, setEmphasizeFirstBeat, setMetronomeSoundType } = useStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Kick off sample loading on mount — shared with jam. Idempotent.
  useEffect(() => { loadClickSamples(); }, []);

  const playClick = (isAccent: boolean, isFirstBeat: boolean) => {
    scheduleClick(getAudioContext().currentTime, {
      soundType: metronome.soundType,
      muted: metronome.muted,
      isAccent,
      isFirstBeat,
      emphasizeFirstBeat: metronome.emphasizeFirstBeat,
    });
  };
  
  useEffect(() => {
    // When jam is playing, its audio-time scheduler is the single source of
    // truth for both chord changes AND clicks (via scheduleClick). The
    // metronome's setInterval loop would drift against it — so we shut it
    // down entirely and let jam drive both clicks and beat display.
    const jamDriving = jam.isPlaying;
    if (jamDriving) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

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
        
        // Update beat display on quarter notes.
        if (subdivisionCount === 0) setCurrentBeat(beat);
        
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
  }, [metronome.isPlaying, metronome.bpm, metronome.beatsPerMeasure, metronome.subdivision, metronome.emphasizeFirstBeat, metronome.soundType, metronome.muted, jam.isPlaying, setCurrentBeat]);
  
  const handleBpmChange = (delta: number) => {
    const newBpm = Math.max(40, Math.min(300, metronome.bpm + delta));
    setBpm(newBpm);
  };
  
  const subdivisions: Array<{ value: typeof metronome.subdivision; label: string; title: string }> = [
    { value: 'quarter', label: '♩', title: 'Quarter notes' },
    { value: 'eighth', label: '♫', title: 'Eighth notes' },
    { value: 'sixteenth', label: '♬', title: 'Sixteenth notes' },
    { value: 'eighthTriplet', label: '♫₃', title: 'Eighth note triplets' },
    { value: 'sixteenthTriplet', label: '♬₃', title: 'Sixteenth note triplets' },
  ];

  return (
    <div className="metronome">
      <div className="sound-type-control">
        <label className="ds-label-inline">Sound:</label>
        <Select
          size="sm"
          value={metronome.soundType}
          onChange={(e) => setMetronomeSoundType(e.target.value as 'synth' | 'asrx')}
          options={[
            { value: 'synth', label: 'Synth' },
            { value: 'asrx', label: 'Block' },
          ]}
        />
      </div>

      <div className="beat-indicators">
        {Array.from({ length: metronome.beatsPerMeasure }, (_, i) => (
          <div
            key={i}
            className={`beat-dot ${i === metronome.currentBeat ? 'active' : ''} ${i === 0 ? 'accent' : ''}`}
          />
        ))}
      </div>

      <div className="bpm-control">
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(-5)} aria-label="-5 BPM">−5</Button>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(-1)} aria-label="-1 BPM">−1</Button>
        <div className="bpm-display">
          <span className="bpm-value">{metronome.bpm}</span>
          <span className="bpm-label">BPM</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(1)} aria-label="+1 BPM">+1</Button>
        <Button variant="outline" size="sm" onClick={() => handleBpmChange(5)} aria-label="+5 BPM">+5</Button>
      </div>

      <div className="time-signature">
        <label className="ds-label-inline">Time:</label>
        <Select
          size="sm"
          value={metronome.beatsPerMeasure}
          onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}
          options={[
            { value: '2', label: '2/4' },
            { value: '3', label: '3/4' },
            { value: '4', label: '4/4' },
            { value: '5', label: '5/4' },
            { value: '6', label: '6/8' },
            { value: '7', label: '7/8' },
          ]}
        />
      </div>

      <div className="emphasis-control">
        <Checkbox
          checked={metronome.emphasizeFirstBeat}
          onCheckedChange={setEmphasizeFirstBeat}
          label="Emphasize First Beat"
        />
      </div>

      <div className="subdivision-control">
        <ToggleButtonGroup label="Subdivision" layout="adjacent">
          {subdivisions.map(s => (
            <Button
              key={s.value}
              variant="outline"
              size="sm"
              active={metronome.subdivision === s.value}
              onClick={() => setSubdivision(s.value)}
              title={s.title}
            >
              {s.label}
            </Button>
          ))}
        </ToggleButtonGroup>
      </div>

      <Button
        variant={metronome.isPlaying ? 'danger' : 'primary'}
        onClick={() => setMetronomePlaying(!metronome.isPlaying)}
      >
        {metronome.isPlaying ? 'Stop' : 'Start'}
      </Button>
    </div>
  );
};