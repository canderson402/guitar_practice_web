// Record calls on a global (CRA resets jest.fn mocks between tests).
type Played = Array<{ midi: number; duration: number; time?: number }>;
const played = (): Played => (globalThis as unknown as { mockPlayed: Played }).mockPlayed;
let mockNow = 10;
jest.mock('../../../audio/engine', () => ({ getAudioContext: () => ({ get currentTime() { return mockNow; } }) }));
jest.mock('../../../audio/guitar', () => ({
  playGuitarNote: (midi: number, duration: number, time?: number) => {
    (globalThis as unknown as { mockPlayed: Played }).mockPlayed.push({ midi, duration, time });
    return Promise.resolve();
  },
}));
// eslint-disable-next-line import/first
import { playSteps } from './playback';

beforeEach(() => { (globalThis as unknown as { mockPlayed: Played }).mockPlayed = []; mockNow = 10; jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

it('plays each step as a quarter note at the tempo, every note of a step together, on exact audio times', () => {
  const steps: number[] = [];
  let done = false;
  playSteps([[48, 52], [50, 53]], 120, i => steps.push(i), () => { done = true; });
  jest.advanceTimersByTime(5000);
  // 120 bpm → 0.5 s per quarter; starts just ahead of now.
  const t0 = played()[0].time!;
  expect(t0).toBeGreaterThan(10);
  expect(played().map(p => [p.midi, p.time! - t0])).toEqual([[48, 0], [52, 0], [50, 0.5], [53, 0.5]]);
  expect(played()[0].duration).toBeLessThanOrEqual(0.5);
  expect(steps).toEqual([0, 1]);
  expect(done).toBe(true);
});

it('stop cancels the steps that haven\'t sounded yet', () => {
  let done = false;
  const stop = playSteps([[48], [50], [52]], 60, () => {}, () => { done = true; });
  jest.advanceTimersByTime(100);   // first step queued
  stop();
  jest.advanceTimersByTime(5000);
  expect(played().map(p => p.midi)).toEqual([48]);
  expect(done).toBe(true);
});
