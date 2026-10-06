import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Metronome.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Switch, Slider, Stepper, Disclosure, DurationInput } from '../../ui';
import type { TempoLadder } from '../../../store/useStore';
import { ladderSummary } from '../../state/useTempoLadder';
import { clampBpm, BPM_MIN, BPM_MAX } from '../../shell/dock/tapTempo';
import { SUBDIVISIONS } from '../../shell/dock/MeterPopover';
import { TimeSignatureInput } from '../../ui';

export const MetronomeSheet: React.FC = () => {
  const m = useStore(useShallow(st => ({
    bpm: st.metronome.bpm, setBpm: st.setBpm,
    beats: st.metronome.beatsPerMeasure, sub: st.metronome.subdivision, accent: st.metronome.emphasizeFirstBeat,
    sound: st.metronome.soundType, volume: st.metronome.volume, muted: st.metronome.muted,
    setBeatsPerMeasure: st.setBeatsPerMeasure, setSubdivision: st.setSubdivision,
    setEmphasizeFirstBeat: st.setEmphasizeFirstBeat, setMetronomeSoundType: st.setMetronomeSoundType,
    setMetronomeVolume: st.setMetronomeVolume, setMetronomeMuted: st.setMetronomeMuted,
    ladder: st.tempoLadder, setLadder: st.setTempoLadder,
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
          onChange={m.setMetronomeVolume} />
      </div>
      {/* Speeds up as you play: from Start, +Step every N bars (or every m:ss),
          holding at Top. Each Play starts the climb over. */}
      <Disclosure title="Tempo ladder" summary={m.ladder.on ? ladderSummary(m.ladder) : 'Off'}>
        <div className={s.inline}><span className={s.label}>Climb as you play</span>
          <Switch label="Tempo ladder" checked={m.ladder.on} onChange={on => m.setLadder({ on })} />
        </div>
        <div className={s.field}><span className={s.label}>Start (BPM)</span>
          <Stepper label="Ladder start tempo" value={m.ladder.start} min={BPM_MIN} max={BPM_MAX} small={1} big={5} editable
            onChange={v => m.setLadder({ start: clampBpm(v) })} />
        </div>
        <div className={s.field}><span className={s.label}>Top (BPM)</span>
          <Stepper label="Ladder top tempo" value={m.ladder.top} min={m.ladder.start} max={BPM_MAX} small={1} big={5} editable
            onChange={v => m.setLadder({ top: clampBpm(v) })} />
        </div>
        <div className={s.field}><span className={s.label}>Step (BPM)</span>
          <Stepper label="Ladder step" value={m.ladder.step} min={1} max={30} small={1} onChange={step => m.setLadder({ step })} />
        </div>
        <div className={s.field}><span className={s.label}>Step up every</span>
          <SegmentedControl<TempoLadder['unit']> label="Ladder every" value={m.ladder.unit} onChange={unit => m.setLadder({ unit })}
            options={[{ value: 'bars', label: 'Bars' }, { value: 'time', label: 'Time' }]} />
          {m.ladder.unit === 'bars'
            ? <Stepper label="Ladder bars" value={m.ladder.every} min={1} max={64} small={1} onChange={every => m.setLadder({ every })} />
            : <DurationInput label="Ladder time" seconds={m.ladder.seconds} onChange={seconds => m.setLadder({ seconds })} />}
        </div>
      </Disclosure>
    </>
  );
};
