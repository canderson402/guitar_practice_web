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
  guitar.start(
    time !== undefined
      ? { note: midi, duration, time, detune }
      : { note: midi, duration, detune },
  );
};
