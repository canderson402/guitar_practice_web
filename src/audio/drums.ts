import { getAudioContext, getMasterGain } from './engine';
import {
  playKickSample, playSnareSample,
  playClosedHatSample, playOpenHatSample,
  setDrumKitDestination,
} from './drumSamples';

// ---------------------------------------------------------------------------
// Drum voices — prefer real samples (smplr DrumMachine), fall back to a
// synthesised voice while the kit loads. Each voice routes to a destination
// you can swap via `setDrumDestination` — callers typically route to their
// own drum part channel (with HPF / pan / reverb send).
// ---------------------------------------------------------------------------

// Shared destination for BOTH the sample path and the synth fallback.
// Defaults to master gain; the JamCard wires in its drum channel on mount.
let destination: AudioNode | null = null;

const getDest = (): AudioNode => destination ?? getMasterGain();

/** Route every subsequent drum hit through `node`. Applies to both sampled
 *  and synth fallback paths. Safe to call any time. */
export const setDrumDestination = (node: AudioNode | null): void => {
  destination = node;
  setDrumKitDestination(node);
};

/** Cached noise buffer — reused across every noise-based hit. 1 s mono white. */
let noiseBuffer: AudioBuffer | null = null;

const getNoiseBuffer = (): AudioBuffer => {
  const ctx = getAudioContext();
  if (noiseBuffer) return noiseBuffer;
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, sampleRate, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
};

/** Kick — sine body sweep + bandpassed noise click transient. */
export const playKick = (startTime?: number, gain = 0.9): void => {
  const ctx = getAudioContext();
  const t = startTime ?? ctx.currentTime;
  if (playKickSample(t, gain)) return;
  const out = getDest();

  const body = ctx.createOscillator();
  body.type = 'sine';
  body.frequency.setValueAtTime(140, t);
  body.frequency.exponentialRampToValueAtTime(42, t + 0.08);

  const bodyEnv = ctx.createGain();
  bodyEnv.gain.setValueAtTime(0, t);
  bodyEnv.gain.linearRampToValueAtTime(gain * 1.2, t + 0.003);
  bodyEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.30);

  body.connect(bodyEnv);
  bodyEnv.connect(out);
  body.start(t);
  body.stop(t + 0.35);

  const click = ctx.createBufferSource();
  click.buffer = getNoiseBuffer();
  const clickBp = ctx.createBiquadFilter();
  clickBp.type = 'bandpass';
  clickBp.frequency.value = 4000;
  clickBp.Q.value = 1.5;
  const clickEnv = ctx.createGain();
  clickEnv.gain.setValueAtTime(gain * 0.5, t);
  clickEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  click.connect(clickBp);
  clickBp.connect(clickEnv);
  clickEnv.connect(out);
  click.start(t);
  click.stop(t + 0.03);

  body.onended = () => { body.disconnect(); bodyEnv.disconnect(); };
  click.onended = () => { click.disconnect(); clickBp.disconnect(); clickEnv.disconnect(); };
};

/** Snare — filtered noise tail + pitched triangle body + 2 kHz crack. */
export const playSnare = (startTime?: number, gain = 0.75): void => {
  const ctx = getAudioContext();
  const t = startTime ?? ctx.currentTime;
  if (playSnareSample(t, gain)) return;
  const out = getDest();

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 1500;
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0, t);
  noiseEnv.gain.linearRampToValueAtTime(gain, t + 0.002);
  noiseEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
  noise.connect(hpf);
  hpf.connect(noiseEnv);
  noiseEnv.connect(out);
  noise.start(t);
  noise.stop(t + 0.22);

  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = 200;
  const bodyEnv = ctx.createGain();
  bodyEnv.gain.setValueAtTime(0, t);
  bodyEnv.gain.linearRampToValueAtTime(gain * 0.7, t + 0.002);
  bodyEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  body.connect(bodyEnv);
  bodyEnv.connect(out);
  body.start(t);
  body.stop(t + 0.11);

  const crack = ctx.createBufferSource();
  crack.buffer = getNoiseBuffer();
  const crackBp = ctx.createBiquadFilter();
  crackBp.type = 'bandpass';
  crackBp.frequency.value = 2000;
  crackBp.Q.value = 1.2;
  const crackEnv = ctx.createGain();
  crackEnv.gain.setValueAtTime(gain * 0.6, t);
  crackEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  crack.connect(crackBp);
  crackBp.connect(crackEnv);
  crackEnv.connect(out);
  crack.start(t);
  crack.stop(t + 0.03);

  noise.onended = () => { noise.disconnect(); hpf.disconnect(); noiseEnv.disconnect(); };
  body.onended = () => { body.disconnect(); bodyEnv.disconnect(); };
  crack.onended = () => { crack.disconnect(); crackBp.disconnect(); crackEnv.disconnect(); };
};

/** Hi-hat — short highpassed noise with metallic bandpass character. */
export const playHat = (startTime?: number, closed = true, gain = 0.35): void => {
  const ctx = getAudioContext();
  const t = startTime ?? ctx.currentTime;
  if (closed) {
    if (playClosedHatSample(t, gain)) return;
    if (playOpenHatSample(t, gain * 0.6)) return;
  } else {
    if (playOpenHatSample(t, gain)) return;
    if (playClosedHatSample(t, gain)) return;
  }
  const out = getDest();

  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer();
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = closed ? 7000 : 6000;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = closed ? 10000 : 8000;
  bp.Q.value = 0.8;
  const env = ctx.createGain();
  const tail = closed ? 0.04 : 0.25;
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.001);
  env.gain.exponentialRampToValueAtTime(0.001, t + tail);
  noise.connect(hpf);
  hpf.connect(bp);
  bp.connect(env);
  env.connect(out);
  noise.start(t);
  noise.stop(t + tail + 0.05);
  noise.onended = () => {
    noise.disconnect();
    hpf.disconnect();
    bp.disconnect();
    env.disconnect();
  };
};
