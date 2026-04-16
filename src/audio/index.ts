// Public audio-engine surface. See individual files for details.

export {
  getAudioContext,
  getMasterGain,
  getReverbSend,
  setMasterVolume,
  resumeAudio,
  disposeAudio,
} from './engine';

export { playNote, playChord } from './synth';
export { playKick, playSnare, playHat, setDrumDestination } from './drums';
export { createScheduler } from './scheduler';

export type { SynthOpts, Scheduler, BeatCallback } from './types';
export { preloadInstrument } from './soundfont';
export { preloadDrumKit, isDrumKitReady } from './drumSamples';
export {
  createChorus,
  createPartChannel,
  scheduleDuck,
} from './effects';
export type { PartChannel, PartChannelOpts, ChorusNode } from './effects';
export { createPadSynth } from './padSynth';
export type { PadSynth, PadVoiceOpts } from './padSynth';
export { scheduleClick, loadClickSamples } from './click';
export type { ClickOpts } from './click';
