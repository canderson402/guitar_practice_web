export const BPM_MIN = 40;
export const BPM_MAX = 300;
const RESET_GAP_MS = 2000;
const WINDOW = 4;

export const clampBpm = (v: number): number =>
  Number.isFinite(v) ? Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(v))) : BPM_MIN;

export interface TapState { taps: number[]; bpm: number | null }
export const INITIAL_TAP: TapState = { taps: [], bpm: null };

/** Pure tap-tempo reducer: BPM from the average of the last ≤4 intervals. */
export const tapTempo = (state: TapState, now: number): TapState => {
  const last = state.taps[state.taps.length - 1];
  if (last === undefined || now - last >= RESET_GAP_MS) return { taps: [now], bpm: null };
  const taps = [...state.taps, now].slice(-(WINDOW + 1));
  const intervals = taps.slice(1).map((t, i) => t - taps[i]);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = avg <= 0 ? BPM_MAX : clampBpm(60000 / avg);
  return { taps, bpm };
};
