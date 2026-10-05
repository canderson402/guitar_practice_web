const made: any[] = [];
jest.mock('./engine', () => {
  const param = (value = 0) => {
    const p: any = { value, events: [] as any[] };
    p.setValueAtTime = (v: number, t: number) => p.events.push(['set', v, t]);
    p.setTargetAtTime = (v: number, t: number) => p.events.push(['target', v, t]);
    p.cancelScheduledValues = () => {};
    return p;
  };
  const ctx: any = {
    currentTime: 1,
    resume: () => Promise.resolve(),
    createOscillator: () => { const o: any = { type: '', frequency: param(), connect: (t: any) => t, disconnect() {}, start() { o.started = true; }, stop(t?: number) { o.stoppedAt = t; } }; made.push(o); return o; },
    createGain: () => ({ gain: param(), connect: (t: any) => t, disconnect() {} }),
  };
  return { getAudioContext: () => ctx, getMasterGain: () => ({}) };
});
// eslint-disable-next-line import/first
import { startReferenceTone, stopReferenceTone, setReferenceToneFrequency, isReferenceTonePlaying } from './referenceTone';

afterEach(() => { stopReferenceTone(); made.length = 0; });

it('plays a sine wave at the given frequency, fading in (no click)', () => {
  startReferenceTone(432);
  expect(isReferenceTonePlaying()).toBe(true);
  expect(made).toHaveLength(1);
  expect(made[0]).toMatchObject({ type: 'sine', started: true });
  expect(made[0].frequency.value).toBe(432);
});

it('follows a new frequency while playing, and starting again doesn\'t stack tones', () => {
  startReferenceTone(440);
  setReferenceToneFrequency(442);
  expect(made[0].frequency.events.at(-1)).toEqual(['target', 442, 1]);
  startReferenceTone(440);
  expect(made).toHaveLength(1);
});

it('stops with a short fade', () => {
  startReferenceTone(440);
  stopReferenceTone();
  expect(isReferenceTonePlaying()).toBe(false);
  expect(made[0].stoppedAt).toBeGreaterThan(1);
});
