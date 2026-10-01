import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Popover, SegmentedControl, Slider } from '../../ui';
import { useStore } from '../../../store/useStore';
import { TimeSignatureInput } from '../../ui';

type Sub = 'quarter' | 'eighth' | 'sixteenth' | 'eighthTriplet' | 'sixteenthTriplet';
export const SUBDIVISIONS: Array<{ value: Sub; label: string; title: string }> = [
  { value: 'quarter', label: '♩', title: 'Quarter notes' },
  { value: 'eighth', label: '♫', title: 'Eighth notes' },
  { value: 'sixteenth', label: '♬', title: 'Sixteenth notes' },
  { value: 'eighthTriplet', label: '♫₃', title: 'Eighth-note triplets' },
  { value: 'sixteenthTriplet', label: '♬₃', title: 'Sixteenth-note triplets' },
];
export const timeSignatureLabel = (beats: number, unit = 4): string => `${beats}/${unit}`;

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-11)', color: 'var(--text-muted)' }}>{label}</span>{children}
  </div>
);

export const MeterPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement | null> }> = (p) => {
  const st = useStore(useShallow(s => ({
    sub: s.metronome.subdivision as Sub, master: s.jam.mixer.master.volume,
    setSubdivision: s.setSubdivision, setJamMixerVolume: s.setJamMixerVolume,
  })));
  return (
    <Popover {...p} width={340} title="Meter & volume">
      <Row label="Time signature"><TimeSignatureInput size="sm" /></Row>
      <Row label="Subdivision">
        <SegmentedControl label="Subdivision" size="sm" value={st.sub} onChange={st.setSubdivision} options={SUBDIVISIONS} />
      </Row>
      <Row label="Master"><Slider label="Master volume" value={Math.min(st.master, 100)} min={0} max={100} onChange={v => st.setJamMixerVolume('master', v)} /></Row>
      {/* Click and pad levels live on the Metronome and Jam cards. */}
    </Popover>
  );
};
