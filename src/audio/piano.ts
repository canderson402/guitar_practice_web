import { SplendidGrandPiano } from 'smplr';
import { getAudioContext, getMasterGain } from './engine';

let piano: SplendidGrandPiano | null = null;
let loading: Promise<SplendidGrandPiano> | null = null;

const getPiano = (): Promise<SplendidGrandPiano> => {
  if (piano) return Promise.resolve(piano);
  if (loading) return loading;
  const ctx = getAudioContext();
  const instance = new SplendidGrandPiano(ctx, {
    destination: getMasterGain(),
  });
  loading = instance.load.then(() => {
    piano = instance;
    loading = null;
    return instance;
  });
  return loading;
};

/** Warm the piano samples ahead of first use so the first press has no
 *  download stall. Safe to call multiple times. */
export const preloadPiano = (): Promise<SplendidGrandPiano> => getPiano();

export const playPianoNote = async (
  midi: number,
  duration = 1.2,
  time?: number,
): Promise<void> => {
  const p = await getPiano();
  p.start(
    time !== undefined
      ? { note: midi, duration, time }
      : { note: midi, duration },
  );
};
