import { useEffect } from 'react';
import { useStore, TempoLadder } from '../../store/useStore';
import { useAudibleBeat } from '../../audio/transport';
import { clampBpm } from '../shell/dock/tapTempo';

/** One rung up: the tempo goes up by the step, never past the top (where it
 *  holds). Steps from the current tempo, so a tempo set by hand mid-climb
 *  carries on from there. */
const stepUp = () => {
  const { metronome, tempoLadder: l, setBpm } = useStore.getState();
  if (metronome.bpm >= l.top) return;
  setBpm(clampBpm(Math.min(l.top, metronome.bpm + l.step)));
};

/** The tempo ladder: pressing play starts at the ladder's start tempo; it
 *  then steps up every N bars (on the bar line) or every m:ss of playing, and
 *  holds at the top. Mounted once, in the app shell, so it
 *  works whichever cards are showing. */
export const useTempoLadder = (): void => {
  const playing = useStore(st => st.metronome.isPlaying);
  const { on, unit, seconds } = useStore(st => st.tempoLadder);

  // Each play starts the climb over.
  useEffect(() => {
    const { tempoLadder: l, setBpm } = useStore.getState();
    if (playing && l.on) setBpm(clampBpm(l.start));
  }, [playing]);

  useAudibleBeat(ev => {
    const { metronome, tempoLadder: l } = useStore.getState();
    if (!l.on || l.unit !== 'bars' || !metronome.isPlaying) return;
    if (ev.beatInBar === 0 && ev.barIndex > 0 && ev.barIndex % l.every === 0) stepUp();
  });

  // By time: only while playing (stopping clears it; playing again restarts the climb).
  useEffect(() => {
    if (!playing || !on || unit === 'bars') return;
    const id = window.setInterval(stepUp, seconds * 1000);
    return () => window.clearInterval(id);
  }, [playing, on, unit, seconds]);
};

/** "80 → 120 · +5 every 4 bars" / "… every 2:00" */
export const ladderSummary = (l: TempoLadder): string => {
  const every = l.unit === 'bars' ? `${l.every} ${l.every === 1 ? 'bar' : 'bars'}`
    : `${Math.floor(l.seconds / 60)}:${String(l.seconds % 60).padStart(2, '0')}`;
  return `${l.start} → ${l.top} · +${l.step} every ${every}`;
};
