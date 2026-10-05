// The click plays through the shared engine; fake just enough of it.
const made = { oscs: 0, buffers: 0, gains: [] as any[], contexts: 0 };
jest.mock('./engine', () => {
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = (extra: object) => ({ connect: () => {}, disconnect: () => {}, ...extra });
  const ctx = {
    currentTime: 0,
    createGain: () => { const g = node({ gain: param(), context: { currentTime: 0 } }); made.gains.push(g); return g; },
    createOscillator: () => { made.oscs += 1; return node({ frequency: param(), start() {}, stop() {} }); },
    createBufferSource: () => { made.buffers += 1; return node({ start() {}, stop() {} }); },
  };
  return { getAudioContext: () => { made.contexts += 1; return ctx; }, getMasterGain: () => node({}) };
});
// eslint-disable-next-line import/first
import { scheduleClick, setClickVolume } from './click';

it('setting the volume before any click doesn\'t start the audio engine; the first click uses it', () => {
  setClickVolume(0.3);
  expect(made.contexts).toBe(0);
  scheduleClick(0.1, { soundType: 'synth', muted: false, isAccent: true, isFirstBeat: false, emphasizeFirstBeat: false });
  expect(made.gains[0].gain.value).toBe(0.3);   // the click bus
});

it('while the sampled click is still loading, the first clicks use the synth click instead of going silent', () => {
  const before = { oscs: made.oscs, buffers: made.buffers };
  scheduleClick(0.1, { soundType: 'asrx', muted: false, isAccent: true, isFirstBeat: true, emphasizeFirstBeat: true });
  expect(made.oscs - before.oscs).toBe(1);
  expect(made.buffers - before.buffers).toBe(0);
});
