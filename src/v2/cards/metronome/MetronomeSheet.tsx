import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Metronome.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Switch, Slider, Stepper } from '../../ui';
import { clampBpm, BPM_MIN, BPM_MAX } from '../../shell/dock/tapTempo';
import { SUBDIVISIONS } from '../../shell/dock/MeterPopover';
import { TimeSignatureInput } from '../../ui';
import { setClickVolume } from '../../../audio';

export const MetronomeSheet: React.FC = () => {
  const m = useStore(useShallow(st => ({
    bpm: st.metronome.bpm, setBpm: st.setBpm,
    beats: st.metronome.beatsPerMeasure, sub: st.metronome.subdivision, accent: st.metronome.emphasizeFirstBeat,
    sound: st.metronome.soundType, volume: st.metronome.volume, muted: st.metronome.muted,
    setBeatsPerMeasure: st.setBeatsPerMeasure, setSubdivision: st.setSubdivision,
    setEmphasizeFirstBeat: st.setEmphasizeFirstBeat, setMetronomeSoundType: st.setMetronomeSoundType,
    setMetronomeVolume: st.setMetronomeVolume, setMetronomeMuted: st.setMetronomeMuted,
  })));
  return (
    <>
      <div className={s.field}><span className={s.label}>Tempo (BPM)</span>
        <Stepper label="Tempo" value={m.bpm} min={BPM_MIN} max={BPM_MAX} small={1} big={5} editable onChange={v => m.setBpm(clampBpm(v))} />
      </div>
      <div className={s.field}><span className={s.label}>Time signature</span>
        <TimeSignatureInput />
      </div>
      <div className={s.field}><span className={s.label}>Subdivision</span>
        <SegmentedControl label="Subdivision" value={m.sub} onChange={m.setSubdivision} options={SUBDIVISIONS} />
      </div>
      <div className={s.inline}><span className={s.label}>Accent first beat</span>
        <Switch label="Accent first beat" checked={m.accent} onChange={m.setEmphasizeFirstBeat} />
      </div>
      <div className={s.field}><span className={s.label}>Sound</span>
        <SegmentedControl label="Sound" value={m.sound} onChange={m.setMetronomeSoundType}
          options={[{ value: 'asrx', label: 'Block' }, { value: 'synth', label: 'Synth' }]} />
      </div>
      <div className={s.inline}><span className={s.label}>Click on</span>
        <Switch label="Click on" checked={!m.muted} onChange={v => m.setMetronomeMuted(!v)} />
      </div>
      <div className={s.field}><span className={s.label}>Click volume</span>
        <Slider label="Click volume" value={m.volume} min={0} max={100} showValue format={v => `${v}%`}
          onChange={v => { m.setMetronomeVolume(v); setClickVolume(v / 100); }} />
      </div>
    </>
  );
};
