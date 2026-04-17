import { Soundfont } from 'smplr';
import { getAudioContext, getMasterGain } from './engine';

let guitar: Soundfont | null = null;
let loading: Promise<Soundfont> | null = null;

const getGuitar = (): Promise<Soundfont> => {
  if (guitar) return Promise.resolve(guitar);
  if (loading) return loading;
  const ctx = getAudioContext();
  const instance = new Soundfont(ctx, {
    kit: 'MusyngKite',
    instrument: 'acoustic_guitar_nylon',
    destination: getMasterGain(),
  });
  loading = instance.load.then(() => {
    guitar = instance;
    loading = null;
    return instance;
  });
  return loading;
};

export const preloadGuitar = (): Promise<Soundfont> => getGuitar();

export const playGuitarNote = async (
  midi: number,
  duration = 1.2,
  time?: number,
): Promise<void> => {
  const g = await getGuitar();
  g.start(
    time !== undefined
      ? { note: midi, duration, time }
      : { note: midi, duration },
  );
};
