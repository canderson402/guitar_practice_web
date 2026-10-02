import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Jam.module.css';
import { useStore } from '../../../store/useStore';
import { ChipButton, Select, Slider } from '../../ui';
import { setClickVolume } from '../../../audio';
import { GROOVES } from '../../../data/drumGrooves';
import { BASS_PATTERNS } from '../../../data/jamHarmony';
import type { BassPattern } from '../../../data/jamHarmony';
import type { TrackId } from '../../../audio/jamEngine';
import { useJamMix, useJamBassPattern } from './useJamSound';
import type { DrumChoice } from './useJamSound';

export const DRUM_OPTIONS = [{ value: 'off', label: 'Off' }, ...GROOVES.map(g => ({ value: g.id, label: g.name }))];

/** Drum groove picker (or Off). */
export const DrumPicker: React.FC<{ size?: 'sm' | 'md' }> = ({ size }) => {
  const { groove, setGroove } = useJamMix();
  return <Select label="Drums" size={size} value={groove} onChange={v => setGroove(v as DrumChoice)} options={DRUM_OPTIONS} />;
};

/** Bass pattern picker. */
export const BassPicker: React.FC = () => {
  const { pattern, setPattern } = useJamBassPattern();
  return <Select label="Bass pattern" value={pattern} onChange={v => setPattern(v as BassPattern)}
    options={BASS_PATTERNS.map(p => ({ value: p.id, label: p.name }))} />;
};

/** Quick on/off for each part, on the card face — the same switch as the
 *  mixer's mute (and the metronome's own mute for the click). */
export const TrackToggles: React.FC = () => {
  const { mix, setTrack } = useJamMix();
  const click = useStore(useShallow(st => ({ muted: st.metronome.muted, setMuted: st.setMetronomeMuted })));
  const toggles = [
    { name: 'Click', on: !click.muted, flip: () => click.setMuted(!click.muted) },
    ...(['drums', 'pad', 'bass'] as TrackId[]).map(id => ({
      name: id === 'pad' ? 'Pad' : id === 'drums' ? 'Drums' : 'Bass',
      on: !mix[id].muted,
      flip: () => setTrack(id, { muted: !mix[id].muted }),
    })),
  ];
  return (
    <div role="group" aria-label="Tracks" className={s.tracks}>
      {toggles.map(t => (
        <button key={t.name} type="button" aria-pressed={t.on} className={[s.trackToggle, t.on ? '' : s.trackOff].join(' ')} onClick={t.flip}>
          {t.name}
        </button>
      ))}
    </div>
  );
};

const TRACKS: Array<{ id: TrackId; name: string }> = [{ id: 'pad', name: 'Pad' }, { id: 'bass', name: 'Bass' }, { id: 'drums', name: 'Drums' }];

/** One strip per track: mute, solo, volume and reverb send. The click strip
 *  is the metronome's own level (no solo or reverb — it's for keeping time). */
export const JamMixer: React.FC = () => {
  const { mix, setTrack } = useJamMix();
  const click = useStore(useShallow(st => ({
    volume: st.metronome.volume, muted: st.metronome.muted, setVolume: st.setMetronomeVolume, setMuted: st.setMetronomeMuted,
  })));
  return (
    <div role="group" aria-label="Mixer" className={s.mixer}>
      <span /><span /><span /><span className={s.mixHead}>Volume</span><span className={s.mixHead}>Reverb</span>
      {TRACKS.map(({ id, name }) => {
        const t = mix[id];
        return (
          <React.Fragment key={id}>
            <span className={s.mixName}>{name}</span>
            <ChipButton className={s.mixToggle} selected={t.muted} aria-pressed={t.muted} aria-label={`Mute ${name}`}
              onClick={() => setTrack(id, { muted: !t.muted })}>M</ChipButton>
            <ChipButton className={s.mixToggle} selected={t.solo} aria-pressed={t.solo} aria-label={`Solo ${name}`}
              onClick={() => setTrack(id, { solo: !t.solo })}>S</ChipButton>
            <Slider label={`${name} volume`} value={t.volume} min={0} max={100} onChange={v => setTrack(id, { volume: v })} />
            <Slider label={`${name} reverb`} value={t.reverb} min={0} max={1} step={0.05} onChange={v => setTrack(id, { reverb: v })} />
          </React.Fragment>
        );
      })}
      <span className={s.mixName}>Click</span>
      <ChipButton className={s.mixToggle} selected={click.muted} aria-pressed={click.muted} aria-label="Mute Click"
        onClick={() => click.setMuted(!click.muted)}>M</ChipButton>
      <span />
      <Slider label="Click volume" value={click.volume} min={0} max={100} onChange={v => { click.setVolume(v); setClickVolume(v / 100); }} />
      <span />
    </div>
  );
};
