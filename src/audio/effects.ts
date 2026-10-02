// ---------------------------------------------------------------------------
// Audio effects — primitives that parts stitch together for their own
// channel strip (EQ + pan + reverb send + insert effects) and global
// processors (chorus, procedural reverb impulse response).
//
// No state — every factory takes the AudioContext and returns plain nodes.
// ---------------------------------------------------------------------------

import { Reverb } from 'smplr';

/**
 * Generate a procedural reverb impulse response: stereo white noise with an
 * exponential amplitude decay. No asset weight, no CORS — perfect for a
 * browser app. Tweak `duration` (seconds of tail) and `decay` (higher = faster
 * decay) to taste. Defaults tuned for a medium room — warm, present, not
 * washy.
 */
export const generateReverbIR = (
  ctx: BaseAudioContext,
  duration = 1.8,
  decay = 2.5,
): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const ir = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // White noise × exponential envelope (1 - t)^decay.
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return ir;
};

/**
 * Stereo chorus — two delay lines modulated by counter-phase LFOs. Pan the
 * two voices hard left/right for width. Classic 80s "dimension" sound.
 */
export interface ChorusNode {
  input: GainNode;
  output: GainNode;
  dispose: () => void;
}

export const createChorus = (ctx: AudioContext): ChorusNode => {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  dry.gain.value = 0.75;
  wet.gain.value = 0.50;

  const delayL = ctx.createDelay(0.1);
  const delayR = ctx.createDelay(0.1);
  delayL.delayTime.value = 0.020;
  delayR.delayTime.value = 0.025;

  const lfoL = ctx.createOscillator();
  const lfoR = ctx.createOscillator();
  lfoL.frequency.value = 0.6;
  lfoR.frequency.value = 0.6;

  const lfoLGain = ctx.createGain();
  const lfoRGain = ctx.createGain();
  lfoLGain.gain.value = 0.003;   // 3 ms modulation depth
  lfoRGain.gain.value = -0.003;  // opposite phase → wider stereo image

  const panL = ctx.createStereoPanner();
  const panR = ctx.createStereoPanner();
  panL.pan.value = -0.6;
  panR.pan.value = 0.6;

  lfoL.connect(lfoLGain).connect(delayL.delayTime);
  lfoR.connect(lfoRGain).connect(delayR.delayTime);

  input.connect(dry).connect(output);
  input.connect(delayL).connect(panL).connect(wet).connect(output);
  input.connect(delayR).connect(panR).connect(wet).connect(output);

  lfoL.start();
  lfoR.start();

  return {
    input,
    output,
    dispose: () => {
      try { lfoL.stop(); lfoR.stop(); } catch { /* already stopped */ }
      input.disconnect();
      output.disconnect();
    },
  };
};

/**
 * Per-part channel strip.
 *
 * Signal flow:
 *   input → [insertEffect] → [HPF] → [LPF] → [peakEQ] → pan → duckGain
 *     → master
 *     → reverbSend * reverbAmount (when > 0)
 *
 * `duckGain` is exposed so the scheduler can automate it (sidechain the
 * kick). `input` is what the instrument player connects to.
 */
export interface PartChannelOpts {
  /** Stereo position −1 (hard left) to +1 (hard right). */
  pan?: number;
  /** Highpass cutoff in Hz — removes rumble that muddies the low end. */
  hpfHz?: number;
  /** Lowpass cutoff in Hz — removes string-click / brittle top. */
  lpfHz?: number;
  /** Low-shelf boost/cut — Hz is the shelf corner, gain in dB. Positive
   *  gains fatten the low end (e.g. bass channel); negative thin it. */
  lowShelfHz?: number;
  lowShelfGainDb?: number;
  /** Peaking-EQ params — single band. Use for dip (negative gain) to
   *  carve boxy 300–500 Hz regions. */
  peakHz?: number;
  peakGainDb?: number;
  peakQ?: number;
  /** Reverb send level, 0 = dry only, 1 = unity into reverb send. */
  reverbAmount?: number;
  /** Optional insert effect (e.g. chorus) inserted before EQ/pan. */
  insertEffect?: { input: AudioNode; output: AudioNode };
}

export interface PartChannel {
  input: GainNode;
  duckGain: GainNode;
  /** Reverb send gain — only present when the channel was created with a
   *  non-null `reverbAmount`. Exposed so callers can tweak the wet level
   *  at runtime without rebuilding the graph. */
  sendGain?: GainNode;
}

export const createPartChannel = (
  ctx: AudioContext,
  masterDest: AudioNode,
  reverbSend: AudioNode,
  opts: PartChannelOpts = {},
): PartChannel => {
  const input = ctx.createGain();
  const duckGain = ctx.createGain();
  duckGain.gain.value = 1;

  // Build chain sequentially. Each filter appended becomes the new tail.
  let tail: AudioNode = input;
  const connect = (next: AudioNode): void => {
    tail.connect(next);
    tail = next;
  };

  if (opts.insertEffect) {
    tail.connect(opts.insertEffect.input);
    tail = opts.insertEffect.output;
  }
  if (opts.hpfHz != null) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = opts.hpfHz;
    hp.Q.value = 0.707;
    connect(hp);
  }
  if (opts.lpfHz != null) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = opts.lpfHz;
    lp.Q.value = 0.707;
    connect(lp);
  }
  if (opts.lowShelfHz != null && opts.lowShelfGainDb != null) {
    const ls = ctx.createBiquadFilter();
    ls.type = 'lowshelf';
    ls.frequency.value = opts.lowShelfHz;
    ls.gain.value = opts.lowShelfGainDb;
    connect(ls);
  }
  if (opts.peakHz != null && opts.peakGainDb != null) {
    const pk = ctx.createBiquadFilter();
    pk.type = 'peaking';
    pk.frequency.value = opts.peakHz;
    pk.gain.value = opts.peakGainDb;
    pk.Q.value = opts.peakQ ?? 1.0;
    connect(pk);
  }
  if (opts.pan != null) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = opts.pan;
    connect(pan);
  }

  connect(duckGain);
  duckGain.connect(masterDest);

  let sendGain: GainNode | undefined;
  if (opts.reverbAmount != null) {
    sendGain = ctx.createGain();
    sendGain.gain.value = opts.reverbAmount;
    duckGain.connect(sendGain);
    sendGain.connect(reverbSend);
  }

  return { input, duckGain, sendGain };
};

/**
 * Schedule a sidechain-style gain duck on `duckNode`. Drops to `floor` at
 * `time`, recovers exponentially over `releaseSec`. Safe to call multiple
 * times; schedule cancellation keeps simultaneous ducks from stacking.
 */
export const scheduleDuck = (
  duckNode: GainNode,
  time: number,
  floor = 0.55,
  releaseSec = 0.180,
): void => {
  const g = duckNode.gain;
  g.cancelScheduledValues(time);
  g.setValueAtTime(1.0, time);
  // Fast attack: 5 ms down to floor.
  g.exponentialRampToValueAtTime(Math.max(0.001, floor), time + 0.005);
  // Then exponential recover to unity over releaseSec.
  g.exponentialRampToValueAtTime(1.0, time + releaseSec);
};

/**
 * Plate reverb (Dattorro's algorithm, as an AudioWorklet) — smooth, dense
 * and gently modulated, which is what makes a pad sound lush. smplr ships
 * the worklet: creating its `Reverb` registers the 'DattorroReverb'
 * processor, and we make our own node from it so we can set the tail.
 *
 * Until the worklet loads (or where worklets aren't supported) the send
 * goes to `fallback` — the shared procedural room reverb.
 */
export interface PlateReverb {
  input: GainNode;
  /** True once sends go to the plate; false if it fell back. */
  ready: Promise<boolean>;
  /** Fade the plate's output out fast (its tail rings for seconds) — on Stop. */
  silence: () => void;
  /** Bring it back — on Play. */
  restore: () => void;
}

// A long, darker tail than the processor's defaults (decay .5, damping .005).
const PLATE_PARAMS = {
  bandwidth: 0.6,        // input lowpass: no fizz going into the tank
  inputDiffusion1: 0.75,
  inputDiffusion2: 0.625,
  decay: 0.85,
  decayDiffusion1: 0.7,
  decayDiffusion2: 0.5,
  damping: 0.35,         // the tail darkens as it fades
  excursionRate: 0.5,
  excursionDepth: 0.9,   // slow modulation: the tail shimmers, never rings
  wet: 1,
  dry: 0,
};
const PLATE_PREDELAY_SEC = 0.025;
const PLATE_RETURN = 0.45;

export const createPlateReverb = (ctx: AudioContext, destination: AudioNode, fallback: AudioNode): PlateReverb => {
  const input = ctx.createGain();
  input.connect(fallback);
  const wet = ctx.createGain();
  wet.gain.value = PLATE_RETURN;
  wet.connect(destination);
  const fadeTo = (v: number, tc: number) => {
    const t = ctx.currentTime;
    wet.gain.cancelScheduledValues(t);
    wet.gain.setTargetAtTime(v, t, tc);
  };
  const ready = (async () => {
    if (!ctx.audioWorklet) return false;
    try {
      await new Reverb(ctx).ready();
      const plate = new AudioWorkletNode(ctx, 'DattorroReverb', {
        outputChannelCount: [2],
        parameterData: { ...PLATE_PARAMS, preDelay: Math.round(PLATE_PREDELAY_SEC * ctx.sampleRate) },
      });
      plate.connect(wet);
      input.connect(plate);
      input.disconnect(fallback);
      return true;
    } catch {
      return false;
    }
  })();
  return {
    input,
    ready,
    silence: () => fadeTo(0, 0.08),
    restore: () => fadeTo(PLATE_RETURN, 0.01),
  };
};
