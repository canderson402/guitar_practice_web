import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Jam.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Select, Slider, Stepper, Disclosure, Button } from '../../ui';
import { PATCH_OPTIONS } from '../../../audio/jamEngine';
import type { PadSettings } from '../../../audio/jamEngine';
import type { Color } from '../../../data/jamHarmony';
import { JamSource } from './JamSource';
import { PresetEditor, SavePresetButton } from '../keys/PresetChips';
import { useJamSound, useJamColor } from './useJamSound';
import { ProgressionMaker } from './ProgressionMaker';
import { JamMixer, DrumPicker, BassPicker } from './JamMixer';

type Knob = { key: keyof PadSettings; label: string; min: number; max: number; step: number; format(v: number): string };
const KNOBS: Knob[] = [
  { key: 'attack', label: 'Attack', min: 0, max: 4, step: 0.05, format: v => `${v.toFixed(2)}s` },
  { key: 'decay', label: 'Decay', min: 0, max: 10, step: 0.1, format: v => `${v.toFixed(1)}s` },
  { key: 'sustain', label: 'Sustain', min: 0, max: 1, step: 0.02, format: v => `${Math.round(v * 100)}%` },
  { key: 'release', label: 'Release', min: 0, max: 10, step: 0.1, format: v => `${v.toFixed(1)}s` },
  { key: 'stagger', label: 'Stagger', min: 0, max: 0.2, step: 0.005, format: v => `${Math.round(v * 1000)}ms` },
  { key: 'detune', label: 'Detune', min: 0, max: 50, step: 1, format: v => `${Math.round(v)}¢` },
  { key: 'cutoff', label: 'Cutoff', min: 200, max: 8000, step: 50, format: v => `${Math.round(v)}Hz` },
];

export const JamSheet: React.FC = () => {
  const j = useStore(useShallow(st => ({
    bars: st.jam.barsPerChord, setBars: st.setJamBarsPerChord, countIn: st.jam.countIn, setCountIn: st.setJamCountIn, mode: st.jam.mode,
  })));
  const sound = useJamSound();
  const { color, setColor } = useJamColor();
  return (
    <>
      <div className={s.field}><span className={s.label}>Chords</span><JamSource /></div>
      {j.mode === 'preset' && <div className={s.field}><span className={s.label}>Make your own</span><ProgressionMaker /></div>}
      <div className={s.field}><span className={s.label}>Chord color</span>
        <Select label="Chord color" value={color} onChange={v => setColor(v as Color)}
          options={[{ value: 'triads', label: 'Triads' }, { value: '7ths', label: '7ths' }, { value: 'lush', label: 'Lush (9ths)' }]} />
      </div>
      <div className={s.field}><span className={s.label}>Bars per chord (follows the time signature)</span>
        <Stepper label="Bars per chord" value={j.bars} min={1} max={16} onChange={j.setBars} editable />
      </div>
      <div className={s.field}><span className={s.label}>Presets (shared with the Note Trainer)</span>
        <PresetEditor />
        <SavePresetButton current={{ mode: 'bars', interval: j.bars }} />
      </div>
      <div className={s.field}><span className={s.label}>Count-in</span>
        <SegmentedControl label="Count-in" value={String(j.countIn)} onChange={v => j.setCountIn(Number(v))}
          options={[{ value: '0', label: 'None' }, { value: '1', label: '1 bar' }, { value: '2', label: '2 bars' }]} />
      </div>
      <div className={s.field}><span className={s.label}>Sound</span>
        <Select label="Sound" value={sound.patchId} onChange={sound.choosePatch} options={PATCH_OPTIONS} />
      </div>
      <div className={s.field}><span className={s.label}>Drums</span><DrumPicker /></div>
      <div className={s.field}><span className={s.label}>Bass</span><BassPicker /></div>
      <div className={s.field}><span className={s.label}>Mixer</span><JamMixer /></div>
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
