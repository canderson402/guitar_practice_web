// ---------------------------------------------------------------------------
// Drum kit — plays the bundled CC0 one-shots in public/samples/drums (see the
// README there for sources). Served from the app itself: no third-party
// fetches. The whole kit is ~1.9 MB, loaded when the Jam card's drums are on.
//
// Real dynamics: each drum has several velocity layers (soft hits are
// separate, darker recordings, not just quieter copies) and alternate takes
// per layer, rotated so no two hits in a row are the same recording. The
// files keep their recorded level relative to each other; KIT_LEVEL balances
// the drums against one another. On top of that each hit varies slightly in
// pitch and level, and a closed hat chokes a ringing open hat like a real
// hi-hat pedal.
// ---------------------------------------------------------------------------

import type { DrumVoice } from '../data/drumGrooves';

const takes = (prefix: string, layers: string[], rr: number[]) =>
  layers.map(l => rr.map(r => `${prefix}_${l}_rr${r}.wav`));

/** Per drum: velocity layers, softest first, each a list of alternate takes. */
export const DRUM_SAMPLES: Record<DrumVoice, string[][]> = {
  kick: [['kick.wav']],
  snare: takes('snare', ['v3', 'v5', 'v6', 'v7', 'v9'], [1, 2]),
  hatClosed: takes('hatc', ['v1', 'v2', 'v3', 'v4'], [1, 2]),
  hatOpen: takes('hato', ['v2'], [1, 2]),
  ride: [['ride_pp1.wav'], ['ride_mp1.wav'], ['ride_f1.wav']],
  // The suspended cymbal struck hard doubles as the crash.
  crash: [['ride_f1.wav']],
};

/** Kit balance — how loud each drum's loudest layer plays. */
export const KIT_LEVEL: Record<DrumVoice, number> = {
  kick: 0.9,
  snare: 0.8,
  hatClosed: 0.32,
  hatOpen: 0.22,
  ride: 0.45,
  crash: 0.5,
};

// Per-hit variation: velocity ±0.05 (so hits near a layer boundary use
// either layer), ±1% playback rate (≈ ±17 cents), up to −1 dB level.
const VELOCITY_SPREAD = 0.05;
const RATE_SPREAD = 0.01;
const LEVEL_SPREAD = 0.11;
// How fast a closed hat chokes an open one (time constant, seconds).
const CHOKE_TC = 0.015;

export interface DrumKit {
  load: () => Promise<void>;
  ready: () => boolean;
  /** Schedule a hit; false if the kit hasn't loaded yet. */
  play: (voice: DrumVoice, time: number, gain: number) => boolean;
  /** Stop every hit scheduled for the future (on Stop). */
  cancel: () => void;
}

export const createDrumKit = (
  ctx: BaseAudioContext,
  destination: AudioNode,
  publicUrl: string,
  fetchFn: (url: string) => Promise<Response> = url => fetch(url),
): DrumKit => {
  const buffers = new Map<string, AudioBuffer>();
  const lastTake = new Map<string, number>();
  let loading: Promise<void> | null = null;
  const pending = new Map<AudioBufferSourceNode, number>();
  let openHat: GainNode | null = null;

  const allFiles = Array.from(new Set(Object.values(DRUM_SAMPLES).flat(2)));
  const loadOne = async (file: string) => {
    const res = await fetchFn(`${publicUrl}/samples/drums/${file}`);
    if (!res.ok) throw new Error(`Failed to load drum sample ${file}: ${res.status}`);
    buffers.set(file, await ctx.decodeAudioData(await res.arrayBuffer()));
  };

  /** The layer for this velocity, and the next take in it. */
  const pick = (voice: DrumVoice, velocity: number): { file: string; layerFloor: number } => {
    const layers = DRUM_SAMPLES[voice];
    const v = Math.min(1, Math.max(0, velocity + (Math.random() * 2 - 1) * VELOCITY_SPREAD));
    const layer = Math.min(layers.length - 1, Math.floor(v * layers.length));
    const key = `${voice}:${layer}`;
    const take = ((lastTake.get(key) ?? -1) + 1) % layers[layer].length;
    lastTake.set(key, take);
    return { file: layers[layer][take], layerFloor: layer / layers.length };
  };

  return {
    load() {
      loading ??= Promise.all(allFiles.map(loadOne)).then(() => {});
      return loading;
    },
    ready: () => allFiles.every(f => buffers.has(f)),
    play(voice, time, gain) {
      const { file, layerFloor } = pick(voice, gain);
      const buffer = buffers.get(file);
      if (!buffer) return false;
      if ((voice === 'hatClosed' || voice === 'hatOpen') && openHat) {
        openHat.gain.setTargetAtTime(0, time, CHOKE_TC);
        openHat = null;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = 1 + (Math.random() * 2 - 1) * RATE_SPREAD;
      const level = ctx.createGain();
      // The layer carries most of the dynamics; within a layer the level
      // eases by up to ~4 dB so accents still differ from the notes around them.
      const withinLayer = 0.6 + 0.4 * Math.min(1, Math.max(0, (gain - layerFloor) * DRUM_SAMPLES[voice].length));
      level.gain.value = KIT_LEVEL[voice] * withinLayer * (1 - Math.random() * LEVEL_SPREAD);
      src.connect(level);
      level.connect(destination);
      if (voice === 'hatOpen') openHat = level;
      pending.set(src, time);
      src.onended = () => { pending.delete(src); src.disconnect(); level.disconnect(); };
      src.start(time);
      return true;
    },
    cancel() {
      const now = ctx.currentTime;
      pending.forEach((startAt, src) => {
        if (startAt <= now) return;
        try { src.stop(); } catch { /* already stopped */ }
        pending.delete(src);
      });
      openHat = null;
    },
  };
};
