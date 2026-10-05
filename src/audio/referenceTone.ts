// ---------------------------------------------------------------------------
// Reference tone — a plain sine at the reference pitch, to tune by ear or
// check the setting. Fades in and out so it never clicks.
// ---------------------------------------------------------------------------

import { getAudioContext, getMasterGain } from './engine';

const LEVEL = 0.18;
const FADE_TC = 0.03;

let tone: { osc: OscillatorNode; gain: GainNode } | null = null;

export const isReferenceTonePlaying = (): boolean => tone !== null;

/** Start the tone at `hz` (does nothing if it's already playing). */
export const startReferenceTone = (hz: number): void => {
  if (tone) return;
  const ctx = getAudioContext();
  void ctx.resume();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = hz;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.setTargetAtTime(LEVEL, ctx.currentTime, FADE_TC);
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.start();
  tone = { osc, gain };
};

/** Glide the playing tone to a new frequency. */
export const setReferenceToneFrequency = (hz: number): void => {
  if (!tone) return;
  const t = getAudioContext().currentTime;
  tone.osc.frequency.cancelScheduledValues(t);
  tone.osc.frequency.setTargetAtTime(hz, t, 0.02);
};

export const stopReferenceTone = (): void => {
  if (!tone) return;
  const { osc, gain } = tone;
  tone = null;
  const t = getAudioContext().currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setTargetAtTime(0, t, FADE_TC);
  osc.stop(t + FADE_TC * 6);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
};
