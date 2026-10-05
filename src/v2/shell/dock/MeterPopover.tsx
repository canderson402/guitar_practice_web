import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Popover, SegmentedControl, Slider, ChipButton } from '../../ui';
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

/** An M (mute) button beside a level slider — like the Jam mixer's strips. */
const Level: React.FC<{ muted: boolean; onMute(): void; muteLabel: string; children: React.ReactNode }> = ({ muted, onMute, muteLabel, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <ChipButton selected={muted} aria-pressed={muted} aria-label={muteLabel} onClick={onMute}
      style={{ width: 28, height: 28, padding: 0, fontSize: 'var(--text-11)', fontWeight: 700, flex: 'none' }}>M</ChipButton>
    <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  </div>
);

export const MeterPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement | null> }> = (p) => {
  const st = useStore(useShallow(s => ({
    sub: s.metronome.subdivision as Sub, master: s.jam.mixer.master.volume, masterMuted: !!s.jam.mixer.master.muted,
    click: s.metronome.volume, clickMuted: s.metronome.muted,
    setSubdivision: s.setSubdivision, setJamMixerVolume: s.setJamMixerVolume, setClick: s.setMetronomeVolume,
    setMasterMuted: s.setMasterMuted, setClickMuted: s.setMetronomeMuted,
  })));
  return (
    <Popover {...p} width={340} title="Meter & volume">
      <Row label="Time signature"><TimeSignatureInput size="sm" /></Row>
      <Row label="Subdivision">
        <SegmentedControl label="Subdivision" size="sm" value={st.sub} onChange={st.setSubdivision} options={SUBDIVISIONS} />
      </Row>
      <Row label="Master">
        <Level muted={st.masterMuted} onMute={() => st.setMasterMuted(!st.masterMuted)} muteLabel="Mute master">
          <Slider label="Master volume" value={Math.min(st.master, 100)} min={0} max={100} onChange={v => st.setJamMixerVolume('master', v)} />
        </Level>
      </Row>
      <Row label="Metronome">
        <Level muted={st.clickMuted} onMute={() => st.setClickMuted(!st.clickMuted)} muteLabel="Mute metronome">
          <Slider label="Metronome volume" value={st.click} min={0} max={100} onChange={st.setClick} />
        </Level>
      </Row>
    </Popover>
  );
};
