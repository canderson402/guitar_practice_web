import React, { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square, SlidersHorizontal } from 'lucide-react';
import s from './Dock.module.css';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { useShortcuts } from '../useShortcuts';
import { BeatDots } from './BeatDots';
import { KeyPopover, scaleShortName } from './KeyPopover';
import { TempoPopover } from './TempoPopover';
import { MeterPopover, SUBDIVISIONS, timeSignatureLabel } from './MeterPopover';

export const Dock: React.FC = () => {
  useShortcuts();
  const st = useStore(useShallow(x => ({
    playing: x.metronome.isPlaying, bpm: x.metronome.bpm, beats: x.metronome.beatsPerMeasure, unit: x.metronome.beatUnit,
    sub: x.metronome.subdivision, master: x.jam.mixer.master.volume,
    note: x.note.selectedNote, scale: x.note.selectedScale, setMetronomePlaying: x.setMetronomePlaying,
  })));
  const openId = useV2Store(x => x.popover);
  const setPopover = useV2Store(x => x.setPopover);
  const keyRef = useRef<HTMLButtonElement>(null);
  const tempoRef = useRef<HTMLButtonElement>(null);
  const meterRef = useRef<HTMLButtonElement>(null);
  const toggle = (id: 'key' | 'tempo' | 'meter') => setPopover(openId === id ? null : id);
  const close = () => setPopover(null);
  const subLabel = SUBDIVISIONS.find(x => x.value === st.sub)?.label ?? '♩';

  return (
    <div className={s.dock} role="region" aria-label="Player">
      <button type="button" className={s.play} aria-label={st.playing ? 'Stop' : 'Play'}
        onClick={() => st.setMetronomePlaying(!st.playing)}>
        {st.playing ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      {/* Key and mode each have a fixed width, so changing either (e.g. the
          Note Trainer cycling keys) never shifts the rest of the dock. */}
      <button ref={keyRef} type="button" className={[s.chip, s.keyChip].join(' ')} aria-haspopup="dialog" aria-expanded={openId === 'key'}
        onClick={() => toggle('key')}>
        <span data-testid="dock-key" className={s.keyPart}>{st.note ?? '—'}</span>{' '}
        <span data-testid="dock-mode" className={s.modePart}>{scaleShortName(st.scale)}</span>
      </button>
      <button ref={tempoRef} type="button" className={s.tempo} aria-haspopup="dialog" aria-expanded={openId === 'tempo'} onClick={() => toggle('tempo')}>
        <span className={s.bpm}>{st.bpm}</span><span className={s.muted}>BPM</span>
      </button>
      <BeatDots count={st.beats} />
      <button ref={meterRef} type="button" className={s.summary} aria-haspopup="dialog" aria-expanded={openId === 'meter'}
        aria-label={`Meter & volume: ${st.beats} beats, ${subLabel}, ${Math.min(st.master, 100)}%`} onClick={() => toggle('meter')}>
        <SlidersHorizontal size={14} className={s.summaryIcon} aria-hidden="true" />
        <span className={s.summaryText}>{timeSignatureLabel(st.beats, st.unit)} · {subLabel} · {Math.min(st.master, 100)}%</span>
      </button>
      <KeyPopover open={openId === 'key'} onClose={close} anchorRef={keyRef} />
      <TempoPopover open={openId === 'tempo'} onClose={close} anchorRef={tempoRef} />
      <MeterPopover open={openId === 'meter'} onClose={close} anchorRef={meterRef} />
    </div>
  );
};
