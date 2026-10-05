// ---------------------------------------------------------------------------
// Fallback tone — a soft, plucky synth note, played while a sampled
// instrument is still downloading so a key press is never silent (or queued
// to play late).
// ---------------------------------------------------------------------------

import { getAudioContext, getMasterGain } from './engine';
import { midiToFreq } from './pitch';

export const playFallbackTone = (midi: number, duration = 1, time?: number): void => {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') void ctx.resume();
  const t = time ?? ctx.currentTime;
  const dur = Math.max(0.2, Math.min(duration, 2));
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = midiToFreq(midi);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.22, t + 0.005);
  gain.gain.setTargetAtTime(0, t + 0.01, dur / 4);
  osc.connect(gain);
  gain.connect(getMasterGain());
  osc.start(t);
  osc.stop(t + dur + 0.1);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
};
