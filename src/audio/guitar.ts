import { Soundfont } from 'smplr';
import { getAudioContext } from './engine';
import { instrumentOutput } from './instrumentVolume';
import { referenceCents } from './pitch';
import { playFallbackTone } from './fallbackTone';

let guitar: Soundfont | null = null;
let loading: Promise<Soundfont> | null = null;

const getGuitar = (): Promise<Soundfont> => {
  if (guitar) return Promise.resolve(guitar);
  if (loading) return loading;
  const ctx = getAudioContext();
  const instance = new Soundfont(ctx, {
    kit: 'MusyngKite',
    instrument: 'acoustic_guitar_nylon',
    destination: instrumentOutput('guitar'),
  });
  loading = instance.load.then(() => {
    guitar = instance;
    loading = null;
    return instance;
  }, err => {
    loading = null;   // a failed download can be retried on the next note
    throw err;
  });
  return loading;
};

export const preloadGuitar = (): Promise<Soundfont> => getGuitar();

export const playGuitarNote = async (
  midi: number,
  duration = 1.2,
  time?: number,
  /** Tag the note so stopGuitarNotes(stopId) can cut it early. */
  stopId?: string,
): Promise<void> => {
  // Still downloading: play a synth tone now rather than queueing the note
  // to sound late (all at once) when the samples arrive.
  if (!guitar) {
    void getGuitar().catch(() => {});
    playFallbackTone(midi, duration, time);
    return;
  }
  // Wake the audio if the browser put it to sleep.
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  // Samples are recorded at A4 = 440: retune them to the reference pitch.
  const detune = referenceCents();
  guitar.start({
    note: midi, duration, detune,
    ...(time !== undefined ? { time } : {}),
    ...(stopId !== undefined ? { stopId } : {}),
  });
};

/** Cut notes started with this stopId now, including ones not yet sounding. */
export const stopGuitarNotes = (stopId: string): void => {
  guitar?.stop(stopId);
};
