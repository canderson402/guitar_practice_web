import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Stepper, Button, EditableNumber } from '../../ui';
import { BeatDots } from '../../shell/dock/BeatDots';
import { clampBpm, BPM_MIN, BPM_MAX } from '../../shell/dock/tapTempo';
import { HeroFace } from '../HeroFace';

export const MetronomeFace: React.FC = () => {
  const m = useStore(useShallow(st => ({
    bpm: st.metronome.bpm, beats: st.metronome.beatsPerMeasure, playing: st.metronome.isPlaying,
    setBpm: st.setBpm, setMetronomePlaying: st.setMetronomePlaying,
  })));
  return (
    <HeroFace
      top={<BeatDots count={m.beats} size="md" />}
      hero={<EditableNumber label="Tempo" value={m.bpm} min={BPM_MIN} max={BPM_MAX} onChange={v => m.setBpm(clampBpm(v))} />}
      caption="BPM"
      controls={<>
        <Stepper label="Tempo" value={m.bpm} min={BPM_MIN} max={BPM_MAX} small={1} big={5} hideValue onChange={v => m.setBpm(clampBpm(v))} />
        <Button variant={m.playing ? 'secondary' : 'primary'} size="sm" aria-label={m.playing ? 'Stop' : 'Play'}
          onClick={() => m.setMetronomePlaying(!m.playing)}>
          {m.playing ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          {m.playing ? 'Stop' : 'Play'}
        </Button>
      </>}
    />
  );
};
