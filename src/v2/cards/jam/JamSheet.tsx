import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Jam.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Select, Slider, Stepper, Switch, Disclosure, Button } from '../../ui';
import { setClickVolume } from '../../../audio';
import { PATCH_OPTIONS } from '../../../audio/jamEngine';
import type { PadSettings } from '../../../audio/jamEngine';
import { JamSource } from './JamSource';
import { useJamSound } from './useJamSound';

type Knob = { key: keyof PadSettings; label: string; min: number; max: number; step: number; format(v: number): string };
const KNOBS: Knob[] = [
  { key: 'attack', label: 'Attack', min: 0, max: 4, step: 0.05, format: v => `${v.toFixed(2)}s` },
  { key: 'decay', label: 'Decay', min: 0, max: 10, step: 0.1, format: v => `${v.toFixed(1)}s` },
  { key: 'sustain', label: 'Sustain', min: 0, max: 1, step: 0.02, format: v => `${Math.round(v * 100)}%` },
  { key: 'release', label: 'Release', min: 0, max: 10, step: 0.1, format: v => `${v.toFixed(1)}s` },
  { key: 'stagger', label: 'Stagger', min: 0, max: 0.2, step: 0.005, format: v => `${Math.round(v * 1000)}ms` },
  { key: 'detune', label: 'Detune', min: 0, max: 50, step: 1, format: v => `${Math.round(v)}¢` },
  { key: 'cutoff', label: 'Cutoff', min: 200, max: 8000, step: 50, format: v => `${Math.round(v)}Hz` },
  { key: 'reverbAmount', label: 'Reverb', min: 0, max: 1.5, step: 0.05, format: v => v.toFixed(2) },
];

export const JamSheet: React.FC = () => {
  const j = useStore(useShallow(st => ({
    bars: st.jam.barsPerChord, countIn: st.jam.countIn, pad: st.jam.mixer.chords,
    click: st.metronome.volume, clickMuted: st.metronome.muted,
    setBars: st.setJamBarsPerChord, setCountIn: st.setJamCountIn,
    setMixerVolume: st.setJamMixerVolume, setMixerMuted: st.setJamMixerMuted,
    setClick: st.setMetronomeVolume, setClickMuted: st.setMetronomeMuted,
  })));
  const sound = useJamSound();
  return (
    <>
      <div className={s.field}><span className={s.label}>Chords</span><JamSource /></div>
      <div className={s.field}><span className={s.label}>Bars per chord</span>
        <Stepper label="Bars per chord" value={j.bars} min={1} max={16} onChange={j.setBars} editable />
      </div>
      <div className={s.field}><span className={s.label}>Count-in</span>
        <SegmentedControl label="Count-in" value={String(j.countIn)} onChange={v => j.setCountIn(Number(v))}
          options={[{ value: '0', label: 'None' }, { value: '1', label: '1 bar' }, { value: '2', label: '2 bars' }]} />
      </div>
      <div className={s.field}><span className={s.label}>Sound</span>
        <Select label="Sound" value={sound.patchId} onChange={sound.choosePatch} options={PATCH_OPTIONS} />
      </div>
      <div className={s.field}><span className={s.label}>Levels</span>
        <div className={s.level}><Switch label="Pad on" checked={!j.pad.muted} onChange={on => j.setMixerMuted('chords', !on)} /><span>Pad</span>
          <Slider label="Pad volume" value={j.pad.volume} min={0} max={100} onChange={v => j.setMixerVolume('chords', v)} /></div>
        <div className={s.level}><Switch label="Click on" checked={!j.clickMuted} onChange={on => j.setClickMuted(!on)} /><span>Click</span>
          <Slider label="Click volume" value={j.click} min={0} max={100} onChange={v => { j.setClick(v); setClickVolume(v / 100); }} /></div>
      </div>
      <Disclosure title="Pad settings">
        {KNOBS.map(k => (
          <div key={k.key} className={s.knob}><span>{k.label}</span>
            <Slider label={k.label} value={sound.pad[k.key]} min={k.min} max={k.max} step={k.step} showValue format={k.format}
              onChange={v => sound.setPad({ ...sound.pad, [k.key]: v })} /></div>
        ))}
        <Button size="sm" variant="ghost" aria-label="Reset pad settings" onClick={sound.resetPad}>Reset to this sound's defaults</Button>
      </Disclosure>
    </>
  );
};
