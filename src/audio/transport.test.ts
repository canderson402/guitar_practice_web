import type { TickEvent } from './transport';

// Fake audio clock: tests advance `mockNow` and fake timers drive the scan.
let mockNow = 0;
jest.mock('./engine', () => ({
  getAudioContext: () => ({
    get currentTime() { return mockNow; },
    outputLatency: 0,
    baseLatency: 0,
    resume: () => Promise.resolve(),
  }),
}));
jest.mock('./click', () => ({
  scheduleClick: jest.fn(),
  loadClickSamples: jest.fn(),
  cancelScheduledClicks: jest.fn(),
}));

// Imported after mocks.
// eslint-disable-next-line import/first
import { initTransport, onSchedule, onAudibleBeat, useTransport } from './transport';
// eslint-disable-next-line import/first
import { useStore } from '../store/useStore';
// eslint-disable-next-line import/first
import { scheduleClick, cancelScheduledClicks } from './click';

const run = (seconds: number) => {
  // Step the audio clock in scan-sized increments so lookahead behaves.
  for (let t = 0; t < seconds; t += 0.025) {
    mockNow += 0.025;
    jest.advanceTimersByTime(25);
  }
};

const setMetronome = (patch: Partial<ReturnType<typeof useStore.getState>['metronome']>) =>
  useStore.setState(s => ({ metronome: { ...s.metronome, ...patch } }));

describe('transport', () => {
  let events: TickEvent[];
  let unsub: () => void;

  beforeAll(() => {
    jest.useFakeTimers();
    // No rAF / Worker in jsdom: transport falls back to setInterval and the
    // hidden-tab drain path isn't used, so drain audible events via rAF shim.
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 16) as unknown as number;
    initTransport();
  });

  beforeEach(() => {
    mockNow = 0;
    events = [];
    (scheduleClick as jest.Mock).mockClear();
    unsub = onSchedule(ev => events.push(ev));
    setMetronome({ bpm: 120, beatsPerMeasure: 4, subdivision: 'quarter', isPlaying: false });
  });

  afterEach(() => {
    unsub();
    setMetronome({ isPlaying: false });
  });

  it('counts beats and bars monotonically at the right times', () => {
    setMetronome({ isPlaying: true });
    run(4.3);
    const beats = events.filter(e => e.subIndex === 0);
    expect(beats.length).toBeGreaterThanOrEqual(8);
    beats.slice(0, 9).forEach((e, i) => {
      expect(e.beatCount).toBe(i);
      expect(e.beatInBar).toBe(i % 4);
      expect(e.barIndex).toBe(Math.floor(i / 4));
      expect(e.time).toBeCloseTo(0.05 + i * 0.5, 6);
    });
  });

  it('schedules subdivisions evenly and accents only the beat', () => {
    setMetronome({ isPlaying: true, subdivision: 'eighthTriplet' });
    run(1.2);
    const firstBeat = events.filter(e => e.beatCount === 0);
    expect(firstBeat.map(e => e.subIndex)).toEqual([0, 1, 2]);
    expect(firstBeat[1].time - firstBeat[0].time).toBeCloseTo(0.5 / 3, 6);
    const accents = (scheduleClick as jest.Mock).mock.calls.slice(0, 3).map(c => c[1].isAccent);
    expect(accents).toEqual([true, false, false]);
  });

  it('applies a BPM change on the next tick', () => {
    setMetronome({ isPlaying: true });
    run(0.3);                    // beat 0 scheduled at 0.05 (and beat 1 at 0.55)
    setMetronome({ bpm: 60 });
    run(3);
    const beats = events.filter(e => e.subIndex === 0);
    const gaps = beats.slice(1).map((e, i) => e.time - beats[i].time);
    expect(gaps[gaps.length - 1]).toBeCloseTo(1, 6);
  });

  it('starts a fresh bar when the meter shrinks mid-bar', () => {
    setMetronome({ isPlaying: true });
    run(1.4);                    // beats 0..2 scheduled (beatInBar 0..2)
    setMetronome({ beatsPerMeasure: 2 });
    run(2);
    const beats = events.filter(e => e.subIndex === 0);
    beats.forEach(e => expect(e.beatInBar).toBeLessThan(e.beatsPerBar));
    const bars = beats.map(e => e.barIndex);
    expect(bars).toEqual([...bars].sort((a, b) => a - b));
  });

  it('delivers audible beats once each, in order, and resets on stop', () => {
    const heard: number[] = [];
    const off = onAudibleBeat(ev => heard.push(ev.beatCount));
    setMetronome({ isPlaying: true });
    run(2.2);
    expect(heard.length).toBeGreaterThanOrEqual(4);
    expect(heard).toEqual(heard.map((_, i) => i));
    expect(useTransport.getState().beatCount).toBe(heard[heard.length - 1]);
    setMetronome({ isPlaying: false });
    expect(useTransport.getState()).toMatchObject({ running: false, beatCount: -1 });
    expect(cancelScheduledClicks).toHaveBeenCalled();
    off();
  });
});
