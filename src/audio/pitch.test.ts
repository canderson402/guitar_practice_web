import { midiToFreq, setReferencePitch, referenceCents, getReferencePitch } from './pitch';

afterEach(() => setReferencePitch(440));

it('defaults to A4 = 440 Hz', () => {
  expect(getReferencePitch()).toBe(440);
  expect(midiToFreq(69)).toBe(440);
  expect(midiToFreq(57)).toBeCloseTo(220, 6);
  expect(referenceCents()).toBe(0);
});

it('follows a new reference pitch everywhere notes become frequencies', () => {
  setReferencePitch(432);
  expect(midiToFreq(69)).toBe(432);
  expect(midiToFreq(81)).toBeCloseTo(864, 6);
  // For sampled instruments (recorded at 440): how far to retune them.
  expect(referenceCents()).toBeCloseTo(-31.77, 2);
});
