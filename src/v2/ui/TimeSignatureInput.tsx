import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './TimeSignatureInput.module.css';
import { useStore } from '../../store/useStore';
import { EditableNumber } from './EditableNumber';
import { SegmentedControl } from './SegmentedControl';

export const BEAT_UNITS = [1, 2, 4, 8, 16, 32];
export const COMMON_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '9/8', '12/8'];

/** Time signature written like notation: click the top or bottom number to
 *  type it, or pick a common one. Edits the shared metronome. */
export const TimeSignatureInput: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const m = useStore(useShallow(st => ({
    beats: st.metronome.beatsPerMeasure, unit: st.metronome.beatUnit ?? 4,
    setBeats: st.setBeatsPerMeasure, setUnit: st.setBeatUnit,
  })));
  const current = `${m.beats}/${m.unit}`;
  return (
    <div className={s.wrap}>
      <div className={[s.stack, s[size]].join(' ')}>
        <EditableNumber label="Beats per bar" value={m.beats} min={1} max={16} onChange={m.setBeats} className={s.num} />
        <span className={s.rule} aria-hidden="true" />
        <EditableNumber label="Beat unit" value={m.unit} min={1} max={32} allowed={BEAT_UNITS} onChange={m.setUnit} className={s.num} />
      </div>
      <SegmentedControl label="Common time signatures" size="sm" columns={4}
        value={COMMON_SIGNATURES.includes(current) ? current : ''}
        onChange={v => { const [b, u] = v.split('/').map(Number); m.setBeats(b); m.setUnit(u); }}
        options={COMMON_SIGNATURES.map(sig => ({ value: sig, label: sig }))} />
    </div>
  );
};
