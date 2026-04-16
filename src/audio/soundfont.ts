import { getAudioContext, getMasterGain } from './engine';
import * as Soundfont from 'soundfont-player';

// ---------------------------------------------------------------------------
// SoundFont instrument loader — lazily loads real instrument samples from a
// free CDN. Instruments are cached after first load. While loading, callers
// get null and should fall back to the oscillator synth.
//
// Each instrument is created with a fixed `destination` — so an instrument
// preloaded onto the "keys" part channel always plays through that channel's
// EQ / pan / reverb send. Layering the same instrument onto two parts isn't
// supported (you'd need two players); in practice each name maps 1:1.
// ---------------------------------------------------------------------------

type SfInstrumentName = Parameters<typeof Soundfont.instrument>[1];

const cache = new Map<string, Soundfont.Player>();
const loading = new Set<string>();

/** Get a loaded instrument, or null if still loading. Triggers a lazy load
 *  to the master gain on first call. Prefer `preloadInstrument` when you
 *  want to pin it to a specific part channel. */
export const getInstrument = (name: string): Soundfont.Player | null => {
  const cached = cache.get(name);
  if (cached) return cached;

  if (!loading.has(name)) {
    loading.add(name);
    const ctx = getAudioContext();
    Soundfont.instrument(ctx, name as SfInstrumentName, {
      soundfont: 'MusyngKite',
      gain: 1,
      destination: getMasterGain(),
    } as any).then(player => {
      cache.set(name, player);
      loading.delete(name);
    }).catch(err => {
      console.warn(`Failed to load soundfont "${name}":`, err);
      loading.delete(name);
    });
  }

  return null;
};

/**
 * Preload an instrument. If `destination` is supplied, the player routes
 * through that node (typically a part channel's input). Otherwise it routes
 * through master gain. Subsequent calls for the same name return the already
 * loaded player regardless of destination — load once, reuse.
 */
export const preloadInstrument = async (
  name: string,
  destination?: AudioNode,
): Promise<Soundfont.Player> => {
  const cached = cache.get(name);
  if (cached) return cached;

  const ctx = getAudioContext();
  loading.add(name);
  const player = await Soundfont.instrument(ctx, name as SfInstrumentName, {
    soundfont: 'MusyngKite',
    gain: 1,
    destination: destination ?? getMasterGain(),
  } as any);
  cache.set(name, player);
  loading.delete(name);
  return player;
};

/** Convert a MIDI number to scientific pitch notation (e.g. 60 → 'C4'). */
export const midiToNoteName = (midi: number): string => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = names[midi % 12];
  return `${note}${octave}`;
};
