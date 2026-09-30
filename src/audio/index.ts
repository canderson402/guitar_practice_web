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
export {
  initTransport,
  restartTransport,
  isTransportRunning,
  onSchedule,
  onAudibleBeat,
  useAudibleBeat,
  atAudibleTime,
  useTransport,
} from './transport';
export type { TickEvent, TransportPosition } from './transport';

export type { SynthOpts } from './types';
export { preloadInstrument } from './soundfont';
export { preloadDrumKit, isDrumKitReady } from './drumSamples';
export {
  createChorus,
  createPartChannel,
  scheduleDuck,
} from './effects';
export type { PartChannel, PartChannelOpts, ChorusNode } from './effects';
export { createPadSynth, PATCHES, DEFAULT_PATCH_ID, getPatch } from './padSynth';
export type { PadSynth, PadVoiceOpts, Patch } from './padSynth';
export { scheduleClick, loadClickSamples, setClickVolume } from './click';
export type { ClickOpts } from './click';
export { playPianoNote } from './piano';
