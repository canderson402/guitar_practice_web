import { tapTempo, INITIAL_TAP, clampBpm } from './tapTempo';

const tapAt = (times: number[]) => times.reduce(tapTempo, INITIAL_TAP);

it('needs two taps before producing a BPM', () => {
  expect(tapAt([1000]).bpm).toBeNull();
  expect(tapAt([1000, 1500]).bpm).toBe(120);
});

it('averages the last four intervals', () => {
  // intervals 500, 500, 500, 1000 -> avg over last 4 = 625ms -> 96 BPM
  expect(tapAt([0, 500, 1000, 1500, 2500]).bpm).toBe(96);
  // older intervals drop out: last 4 intervals are all 500 -> 120
  expect(tapAt([0, 1000, 1500, 2000, 2500, 3000]).bpm).toBe(120);
});

it('resets after a gap of 2 seconds or more', () => {
  const s = tapAt([0, 500, 3000]);
  expect(s.taps).toEqual([3000]);
  expect(s.bpm).toBeNull();
});

it('clamps to 40..300 and never returns NaN/Infinity', () => {
  expect(tapAt([0, 50]).bpm).toBe(300);          // 1200 BPM -> 300
  expect(tapAt([0, 1999]).bpm).toBe(40);         // ~30 BPM -> 40
  expect(tapAt([1000, 1000]).bpm).toBe(300);     // zero interval -> clamped, finite
  expect(clampBpm(Number.NaN)).toBe(40);
});
