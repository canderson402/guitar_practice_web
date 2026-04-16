// ---------------------------------------------------------------------------
// Audio engine — shared singletons for the master bus and reverb send.
//
// Signal flow:
//
//   parts → masterInput ─┬─> compressor → masterVolume → destination
//                        │
//                        └─<── reverbReturn <── convolver <── reverbSend
//                                                              ↑
//                                              parts may send here for wet
//
// Design notes (post-upgrade):
// - Per-part EQ now lives on each part channel (see effects.ts). The old
//   global lowShelf / highShelf were lifting everything indiscriminately
//   (including mud) and are removed.
// - Compressor retuned from −18 dB / 3:1 (slamming everything, acting as a
//   limiter) to −10 dB / 2:1 — catches peaks and glues the mix without
//   squashing dynamics flat.
// - `masterVolume` is a post-compressor stage so the slider adjusts the
//   final output without changing compressor behaviour.
// - Reverb is a procedural stereo IR (see effects.ts) routed through a
//   convolver with a sensible wet return gain. Parts opt in via their
//   channel config (`reverbAmount`).
// ---------------------------------------------------------------------------

import { generateReverbIR } from './effects';

let ctx: AudioContext | null = null;
let masterInput: GainNode | null = null;   // where parts connect their dry output
let masterVolume: GainNode | null = null;  // post-compressor final volume
let reverbSend: GainNode | null = null;    // parts send wet signal here
let resumeInstalled = false;

/** Get (or create) the shared AudioContext. Idempotent. */
export const getAudioContext = (): AudioContext => {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  ctx = new Ctor();

  // --- Dry master chain ---
  masterInput = ctx.createGain();
  masterInput.gain.value = 1;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -10;   // catches peaks, not average
  compressor.ratio.value = 2;         // gentle glue, not limiting
  compressor.attack.value = 0.010;
  compressor.release.value = 0.120;
  compressor.knee.value = 8;

  masterVolume = ctx.createGain();
  masterVolume.gain.value = 1;

  masterInput.connect(compressor);
  compressor.connect(masterVolume);
  masterVolume.connect(ctx.destination);

  // --- Reverb send/return bus ---
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 1;

  const convolver = ctx.createConvolver();
  convolver.buffer = generateReverbIR(ctx, 1.8, 2.5);

  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.38;  // global wet-to-dry balance

  reverbSend.connect(convolver);
  convolver.connect(reverbReturn);
  reverbReturn.connect(masterInput);

  installGestureResume();
  return ctx;
};

/** Legacy name — returns the master input node (where parts connect). Kept
 *  so existing callers (soundfont-player, synth fallback, drums) keep working
 *  until they're migrated onto per-part channels. */
export const getMasterGain = (): GainNode => {
  if (!masterInput) getAudioContext();
  return masterInput!;
};

/** The reverb send bus. Part channels may tap into this at `reverbAmount`. */
export const getReverbSend = (): GainNode => {
  if (!reverbSend) getAudioContext();
  return reverbSend!;
};

/** Set the final (post-compressor) master output volume. Range 0–1.
 *  Smoothed via setTargetAtTime so slider drags don't zipper. */
export const setMasterVolume = (value: number): void => {
  if (!masterVolume) getAudioContext();
  const g = masterVolume!;
  g.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), g.context.currentTime, 0.01);
};

/** Force-resume the context. Safe to call multiple times. */
export const resumeAudio = async (): Promise<void> => {
  const c = getAudioContext();
  if (c.state === 'suspended') {
    await c.resume();
  }
};

/** Tear down the context. Primarily for tests; the app keeps the engine
 *  alive for the lifetime of the tab. */
export const disposeAudio = (): void => {
  if (ctx) {
    ctx.close();
    ctx = null;
    masterInput = null;
    masterVolume = null;
    reverbSend = null;
  }
};

/** Install a one-shot gesture handler. First pointerdown/keydown after the
 *  context is created resumes it; handler detaches afterwards. */
const installGestureResume = (): void => {
  if (resumeInstalled) return;
  resumeInstalled = true;
  const handler = () => {
    resumeAudio();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('pointerdown', handler, { once: false });
  window.addEventListener('keydown', handler, { once: false });
};
