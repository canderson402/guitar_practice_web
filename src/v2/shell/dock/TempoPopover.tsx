import React, { useRef, useState } from 'react';
import { Popover, Stepper, Slider, Button } from '../../ui';
import { useStore } from '../../../store/useStore';
import { tapTempo, INITIAL_TAP, clampBpm, BPM_MIN, BPM_MAX } from './tapTempo';

export const TempoPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement | null> }> = (p) => {
  const bpm = useStore(st => st.metronome.bpm);
  const setBpm = useStore(st => st.setBpm);
  const tapRef = useRef(INITIAL_TAP);
  const [taps, setTaps] = useState(0);
  const onTap = () => {
    tapRef.current = tapTempo(tapRef.current, performance.now());
    setTaps(tapRef.current.taps.length);
    if (tapRef.current.bpm !== null) setBpm(tapRef.current.bpm);
  };
  return (
    <Popover {...p} title="Tempo">
      {/* Opens ready to type: click the tempo, type a BPM, Enter. */}
      <Stepper label="Tempo" value={bpm} min={BPM_MIN} max={BPM_MAX} small={1} big={5} editable autoEdit onChange={v => setBpm(clampBpm(v))} />
      <Slider label="Tempo slider" value={bpm} min={BPM_MIN} max={BPM_MAX} onChange={v => setBpm(clampBpm(v))} />
      <Button onClick={onTap}>Tap tempo{taps > 1 ? ` · ${taps}` : ''}</Button>
    </Popover>
  );
};
