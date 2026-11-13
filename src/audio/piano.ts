import { SplendidGrandPiano } from 'smplr';
import { getAudioContext } from './engine';
import { instrumentOutput } from './instrumentVolume';
import { referenceCents } from './pitch';
import { playFallbackTone } from './fallbackTone';

let piano: SplendidGrandPiano | null = null;
const ALL_KEYS = Array.from({ length: 88 }, (_, i) => 21 + i);
let loading: Promise<SplendidGrandPiano> | null = null;

const getPiano = (): Promise<SplendidGrandPiano> => {
  if (piano) return Promise.resolve(piano);
  if (loading) return loading;
  const ctx = getAudioContext();
  const instance = new SplendidGrandPiano(ctx, {
    destination: instrumentOutput('piano'),
    // One velocity layer (the one notes play at) — a fifth of the download.
    notesToLoad: { notes: ALL_KEYS, velocityRange: [85, 100] },
  });
  loading = instance.load.then(() => {
    piano = instance;
    loading = null;
    return instance;
  }, err => {
    loading = null;   // a failed download can be retried on the next note
    throw err;
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
  /** Tag the note so stopPianoNotes(stopId) can cut it early. */
  stopId?: string,
): Promise<void> => {
  // Still downloading: play a synth tone now rather than queueing the note
  // to sound late (all at once) when the samples arrive.
  if (!piano) {
    void getPiano().catch(() => {});
    playFallbackTone(midi, duration, time);
    return;
  }
  // Wake the audio if the browser put it to sleep.
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  // Samples are recorded at A4 = 440: retune them to the reference pitch.
  const detune = referenceCents();
  piano.start({
    note: midi, duration, detune,
    ...(time !== undefined ? { time } : {}),
    ...(stopId !== undefined ? { stopId } : {}),
  });
};

/** Cut notes started with this stopId now, including ones not yet sounding. */
export const stopPianoNotes = (stopId: string): void => {
  piano?.stop(stopId);
};
