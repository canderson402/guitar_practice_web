import React, { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { loadClickSamples, setClickVolume, useTransport } from '../audio';
import { Button, Select, Checkbox, ToggleButtonGroup } from '../ui';
import './Metronome.css';

// The Metronome card is a view onto the app-wide transport (src/audio/
// transport.ts): Start/Stop flips `metronome.isPlaying`, the transport owns
// the clock and the clicks, and the beat dots read the heard position.

/** Beat dots — the only part of the card that re-renders per beat. */
const BeatDots: React.FC<{ beatsPerMeasure: number }> = ({ beatsPerMeasure }) => {
  const running = useTransport(s => s.running);
  const beatInBar = useTransport(s => s.beatInBar);
  const heard = useTransport(s => s.beatCount >= 0);
  const active = running && heard ? beatInBar : -1;
  return (
    <div className="beat-indicators">
      {Array.from({ length: beatsPerMeasure }, (_, i) => (
        <div
          key={i}
          className={`beat-dot ${i === active ? 'active' : ''} ${i === 0 ? 'accent' : ''}`}
        />
      ))}
    </div>
  );
};

export const Metronome: React.FC = () => {
  const metronome = useStore(s => s.metronome);
  const {
    setMetronomePlaying, setBpm, setBeatsPerMeasure, setSubdivision,
    setEmphasizeFirstBeat, setMetronomeSoundType,
  } = useStore(useShallow(s => ({
    setMetronomePlaying: s.setMetronomePlaying,
    setBpm: s.setBpm,
    setBeatsPerMeasure: s.setBeatsPerMeasure,
    setSubdivision: s.setSubdivision,
    setEmphasizeFirstBeat: s.setEmphasizeFirstBeat,
    setMetronomeSoundType: s.setMetronomeSoundType,
  })));

  // Kick off sample loading on mount — shared with jam. Idempotent.
  useEffect(() => { loadClickSamples(); }, []);

  useEffect(() => { setClickVolume(metronome.volume / 100); }, [metronome.volume]);

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

      <BeatDots beatsPerMeasure={metronome.beatsPerMeasure} />

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