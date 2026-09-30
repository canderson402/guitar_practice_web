import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square } from 'lucide-react';
import s from './Jam.module.css';
import { useStore } from '../../../store/useStore';
import { useTransport } from '../../../audio';
import { startJam, stopJam, jamCountdownText } from '../../../audio/jamEngine';
import { JamSource } from './JamSource';
import { useJamEngine } from './useJamSound';

/** Countdown from the heard transport position — the only part that
 *  re-renders every beat. */
const Countdown: React.FC = () => {
  const jam = useStore(useShallow(st => ({ isPlaying: st.jam.isPlaying, countIn: st.jam.countIn, barsPerChord: st.jam.barsPerChord })));
  const pos = useTransport(useShallow(t => ({ beatCount: t.beatCount, barIndex: t.barIndex, beatInBar: t.beatInBar, beatsPerBar: t.beatsPerBar })));
  const text = jamCountdownText(jam, pos);
  const final = !!text?.startsWith('Next');
  return <span className={[s.countdown, final ? s.final : ''].join(' ')}>{text ?? (jam.isPlaying ? '' : `${jam.barsPerChord} bars per chord`)}</span>;
};

/** A pad plays through a chord progression in the shared key, on the shared
 *  transport (tempo and meter come from the dock). */
export const JamFace: React.FC = () => {
  useJamEngine();
  const j = useStore(useShallow(st => ({
    playing: st.jam.isPlaying, mode: st.jam.mode, preset: st.jam.selectedPreset,
    queue: st.jam.chordQueue, index: st.jam.currentChordIndex,
  })));
  const current = j.queue[j.index] ?? null;
  const next = j.queue[j.index + 1] ?? (j.mode === 'preset' && j.queue.length > 0 ? j.queue[0] : null);
  const upcoming = j.queue.slice(j.index + 2, j.index + 6);
  const canPlay = j.mode === 'infinite' || j.preset !== null;

  return (
    <div className={s.face}>
      <div className={s.transport}>
        <button type="button" className={[s.play, j.playing ? s.playing : ''].join(' ')} disabled={!canPlay}
          aria-label={j.playing ? 'Stop jam' : 'Play jam'} onClick={j.playing ? stopJam : startJam}>
          {j.playing ? <Square size={18} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        <Countdown />
      </div>

      <div className={s.chords}>
        <div className={s.current} data-testid="jam-current">
          <span className={s.chordName}>{current ? `${current.note}${current.symbol}` : '—'}</span>
          <span className={s.roman}>{current?.roman ?? ''}</span>
        </div>
        {next && (
          <>
            <span className={s.arrow} aria-hidden="true">→</span>
            <div className={s.next} data-testid="jam-next">
              <span className={s.nextName}>{`${next.note}${next.symbol}`}</span>
              <span className={s.roman}>{next.roman}</span>
            </div>
          </>
        )}
        {upcoming.length > 0 && (
          <ul aria-label="Coming up" className={s.upcoming}>
            {upcoming.map((c, i) => <li key={`${j.index}-${i}`} style={{ opacity: 0.8 - i * 0.15 }}>{`${c.note}${c.symbol}`}</li>)}
          </ul>
        )}
      </div>

      <JamSource compact />
    </div>
  );
};
