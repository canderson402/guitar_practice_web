import { getAudioContext, getMasterGain } from './engine';

// Each sampled instrument plays through its own volume, before the master.
// 50% is the samples' own level; up to 100% boosts them (×4, +12 dB) — the
// nylon guitar samples are quiet next to everything else.

export type Instrument = 'guitar' | 'piano';

/** Slider 0–100 → gain: 0 silent, 50 as recorded, 100 four times as loud. */
export const volumeToGain = (volume: number): number => 4 * (Math.max(0, Math.min(100, volume)) / 100) ** 2;

const gainFor: Record<Instrument, number> = { guitar: volumeToGain(80), piano: volumeToGain(50) };
const nodes: Partial<Record<Instrument, GainNode>> = {};

/** Where an instrument's samples play into (created on first use). */
export const instrumentOutput = (instrument: Instrument): GainNode => {
  let node = nodes[instrument];
  if (!node) {
    node = getAudioContext().createGain();
    node.gain.value = gainFor[instrument];
    node.connect(getMasterGain());
    nodes[instrument] = node;
  }
  return node;
};

export const setInstrumentVolume = (instrument: Instrument, volume: number): void => {
  gainFor[instrument] = volumeToGain(volume);
  const node = nodes[instrument];
  if (node) node.gain.value = gainFor[instrument];
};
