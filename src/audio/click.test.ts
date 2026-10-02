// The click plays through the shared engine; fake just enough of it.
const made = { oscs: 0, buffers: 0 };
jest.mock('./engine', () => {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = (extra: object) => ({ connect: () => {}, disconnect: () => {}, ...extra });
  const ctx = {
    currentTime: 0,
    createGain: () => node({ gain: param(), context: { currentTime: 0 } }),
    createOscillator: () => { made.oscs += 1; return node({ frequency: param(), start() {}, stop() {} }); },
    createBufferSource: () => { made.buffers += 1; return node({ start() {}, stop() {} }); },
  };
  return { getAudioContext: () => ctx, getMasterGain: () => node({}) };
});
// eslint-disable-next-line import/first
import { scheduleClick } from './click';

it('while the sampled click is still loading, the first clicks use the synth click instead of going silent', () => {
  scheduleClick(0.1, { soundType: 'asrx', muted: false, isAccent: true, isFirstBeat: true, emphasizeFirstBeat: true });
  expect(made.oscs).toBe(1);
  expect(made.buffers).toBe(0);
});
