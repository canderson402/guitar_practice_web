import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { Stepper, Button, EditableNumber, SegmentedControl } from '../../ui';
import { SUBDIVISIONS } from '../../shell/dock/MeterPopover';
import { BeatDots } from '../../shell/dock/BeatDots';
import { clampBpm, BPM_MIN, BPM_MAX } from '../../shell/dock/tapTempo';
import { HeroFace } from '../HeroFace';

export const MetronomeFace: React.FC = () => {
  const m = useStore(useShallow(st => ({
    bpm: st.metronome.bpm, beats: st.metronome.beatsPerMeasure, playing: st.metronome.isPlaying, sub: st.metronome.subdivision,
    setBpm: st.setBpm, setMetronomePlaying: st.setMetronomePlaying, setSubdivision: st.setSubdivision,
  })));
  return (
    <HeroFace
      top={<BeatDots count={m.beats} size="md" />}
      hero={<EditableNumber label="Tempo" value={m.bpm} min={BPM_MIN} max={BPM_MAX} onChange={v => m.setBpm(clampBpm(v))} />}
      caption="BPM"
      controls={<>
        {/* Steps and Play share a row so the subdivisions fit on a small card. */}
        <div data-testid="metronome-transport" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Stepper label="Tempo" value={m.bpm} min={BPM_MIN} max={BPM_MAX} small={1} big={5} hideValue onChange={v => m.setBpm(clampBpm(v))} />
          <Button variant={m.playing ? 'secondary' : 'primary'} size="sm" aria-label={m.playing ? 'Stop' : 'Play'}
            onClick={() => m.setMetronomePlaying(!m.playing)}>
            {m.playing ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {m.playing ? 'Stop' : 'Play'}
          </Button>
        </div>
        <SegmentedControl label="Subdivision" size="sm" value={m.sub} onChange={m.setSubdivision} options={SUBDIVISIONS} />
      </>}
    />
  );
};
