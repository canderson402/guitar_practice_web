// ---------------------------------------------------------------------------
// Transport — the app's one and only metronome clock.
//
// Every card that needs time (Metronome, Jam, Note Selector, Circle of
// Fifths trainer, Practice Progress) is a *view* onto this module; none of
// them keep their own timers. Start/stop follows `metronome.isPlaying` in the
// app store, and BPM / time signature / subdivision / click sound are read
// live from the store at schedule time, so changes land on the very next
// tick.
//
// Timing model (Chris Wilson's lookahead pattern):
//   - A Web Worker ticks every 25 ms. Worker timers keep running when the
//     tab is backgrounded, where main-thread setInterval gets throttled to
//     ~1 s and audio would drop out.
//   - Each tick schedules every subdivision falling in the next 100 ms at a
//     sample-accurate AudioContext time: the click, plus `onSchedule`
//     listeners (Jam uses this to place chords exactly on the beat).
//   - UI never updates at schedule time — that runs ~100 ms early plus the
//     output device's latency. Instead each beat is queued and applied by a
//     requestAnimationFrame loop on the first frame after the beat is
//     actually *heard* (`currentTime − outputLatency`). While the tab is
//     hidden (no rAF), the worker tick drains the queue instead.
//
// Position is counted, not detected: every event carries a monotonically
// increasing `beatCount` and `barIndex`, so consumers compute "bar 3 of 4"
// or "change every 8 beats" arithmetically and can never miss or double a
// beat.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { getAudioContext } from './engine';
import { scheduleClick, loadClickSamples, cancelScheduledClicks } from './click';
import { useStore } from '../store/useStore';

const SCAN_INTERVAL_MS = 25;
const LOOKAHEAD_SEC = 0.1;
const START_OFFSET_SEC = 0.05;

type Subdivision = 'quarter' | 'eighth' | 'sixteenth' | 'eighthTriplet' | 'sixteenthTriplet';

const SUBS_PER_BEAT: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
  eighthTriplet: 3,
  sixteenthTriplet: 6,
};

/** One scheduled subdivision tick. */
export interface TickEvent {
  /** AudioContext time the tick sounds. */
  time: number;
  /** 0-based subdivision within the beat (0 = the beat itself). */
  subIndex: number;
  subsPerBeat: number;
  /** Beats since start, 0-based, never resets while running. */
  beatCount: number;
  /** 0-based beat within the current bar. */
  beatInBar: number;
  /** Bars since start, 0-based. */
  barIndex: number;
  beatsPerBar: number;
  /** Seconds per beat at the moment this tick was scheduled. */
  beatDuration: number;
}

/** Beat position as last *heard* — what every visual indicator reads. */
export interface TransportPosition {
  running: boolean;
  /** −1 before the first beat is heard. */
  beatCount: number;
  beatInBar: number;
  barIndex: number;
  beatsPerBar: number;
}

const IDLE_POSITION: TransportPosition = {
  running: false,
  beatCount: -1,
  beatInBar: 0,
  barIndex: 0,
  beatsPerBar: 4,
};

/** Tiny store holding only the heard position. Kept separate from the app
 *  store so a beat re-renders just the indicators that select from it. */
export const useTransport = create<TransportPosition>(() => IDLE_POSITION);

// ---- Listeners ----

type TickListener = (ev: TickEvent) => void;
const scheduleListeners = new Set<TickListener>();
const audibleBeatListeners = new Set<TickListener>();

/** Called at schedule time (~100 ms early) for every subdivision tick, with
 *  the exact audio time. For scheduling sound only — never touch UI here. */
export const onSchedule = (fn: TickListener): (() => void) => {
  scheduleListeners.add(fn);
  return () => { scheduleListeners.delete(fn); };
};

/** Called once per beat (subIndex 0) at the moment the beat is heard. Fires
 *  synchronously per beat, in order — safe for counting. */
export const onAudibleBeat = (fn: TickListener): (() => void) => {
  audibleBeatListeners.add(fn);
  return () => { audibleBeatListeners.delete(fn); };
};

/** React hook form of `onAudibleBeat`; always calls the latest callback. */
export const useAudibleBeat = (fn: TickListener): void => {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => onAudibleBeat(ev => ref.current(ev)), []);
};

// ---- Audible-time queue (drained by rAF / hidden-tab worker tick) ----

interface Pending { time: number; fn: () => void }
let pending: Pending[] = [];
let rafId: number | null = null;

// Output latency, read once when the transport starts. Browsers revise the
// live estimate while playing; re-reading it every frame made beats land
// unevenly (two due in one frame → a dot skipped, i.e. a flicker).
let latency = 0;
const readLatency = (): number => {
  const ctx = getAudioContext();
  return Math.min(0.5, Math.max(0, ctx.outputLatency || ctx.baseLatency || 0));
};

const audibleNow = (): number => getAudioContext().currentTime - latency;

const drain = (): void => {
  if (pending.length === 0) return;
  const now = audibleNow();
  let i = 0;
  while (i < pending.length && pending[i].time <= now) i++;
  if (i === 0) return;
  const due = pending.slice(0, i);
  pending = pending.slice(i);
  due.forEach(p => p.fn());
};

const frame = (): void => {
  drain();
  rafId = running || pending.length > 0 ? requestAnimationFrame(frame) : null;
};

const ensureFrameLoop = (): void => {
  if (rafId === null && typeof requestAnimationFrame !== 'undefined') {
    rafId = requestAnimationFrame(frame);
  }
};

/** Run `fn` on the first frame after audio time `time` is heard. Events are
 *  scheduled in time order, so the queue stays sorted by appending. */
export const atAudibleTime = (time: number, fn: () => void): void => {
  pending.push({ time, fn });
  ensureFrameLoop();
};

// ---- Tick source: Web Worker with setInterval fallback ----

const WORKER_SRC = `
let id = null;
onmessage = (e) => {
  if (e.data === 'start' && id === null) id = setInterval(() => postMessage(0), ${SCAN_INTERVAL_MS});
  if (e.data === 'stop' && id !== null) { clearInterval(id); id = null; }
};`;

let worker: Worker | null = null;
let fallbackId: ReturnType<typeof setInterval> | null = null;

const startTicks = (onTick: () => void): void => {
  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      if (!worker) {
        const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
        worker = new Worker(url);
      }
      worker.onmessage = onTick;
      worker.postMessage('start');
      return;
    } catch {
      worker = null;   // CSP or sandbox refused — fall back below
    }
  }
  fallbackId = setInterval(onTick, SCAN_INTERVAL_MS);
};

const stopTicks = (): void => {
  worker?.postMessage('stop');
  if (fallbackId !== null) {
    clearInterval(fallbackId);
    fallbackId = null;
  }
};

// ---- Scheduler state ----

let running = false;
let nextTime = 0;
let subIndex = 0;
let subsPerBeat = 1;
let beatCount = 0;
let beatInBar = 0;
let barIndex = 0;
let beatsPerBar = 4;

const scheduleTick = (): void => {
  const m = useStore.getState().metronome;
  const beatDuration = 60 / Math.max(1, m.bpm);

  if (subIndex === 0) {
    // Time signature + subdivision are sampled per beat so a change never
    // splits a beat.
    subsPerBeat = SUBS_PER_BEAT[m.subdivision] ?? 1;
    if (beatCount > 0) {
      beatInBar += 1;
      if (beatInBar >= beatsPerBar) {
        beatInBar = 0;
        barIndex += 1;
      }
    }
    beatsPerBar = Math.max(1, m.beatsPerMeasure);
    if (beatInBar >= beatsPerBar) {
      // Meter shrank mid-bar — start a fresh bar.
      beatInBar = 0;
      barIndex += 1;
    }
  }

  const ev: TickEvent = {
    time: nextTime, subIndex, subsPerBeat, beatCount, beatInBar, barIndex, beatsPerBar,
    beatDuration,
  };

  scheduleClick(nextTime, {
    soundType: m.soundType,
    muted: m.muted,
    isAccent: subIndex === 0,
    isFirstBeat: subIndex === 0 && beatInBar === 0,
    emphasizeFirstBeat: m.emphasizeFirstBeat,
  });
  scheduleListeners.forEach(fn => fn(ev));

  if (subIndex === 0) {
    atAudibleTime(nextTime, () => {
      if (!running) return;
      useTransport.setState({
        running: true,
        beatCount: ev.beatCount,
        beatInBar: ev.beatInBar,
        barIndex: ev.barIndex,
        beatsPerBar: ev.beatsPerBar,
      });
      audibleBeatListeners.forEach(fn => fn(ev));
    });
  }

  nextTime += beatDuration / subsPerBeat;
  subIndex += 1;
  if (subIndex >= subsPerBeat) {
    subIndex = 0;
    beatCount += 1;
  }
};

const scan = (): void => {
  if (!running) return;
  const horizon = getAudioContext().currentTime + LOOKAHEAD_SEC;
  while (nextTime < horizon) scheduleTick();
  // rAF doesn't run in hidden tabs; keep UI state and counters current.
  if (typeof document !== 'undefined' && document.hidden) drain();
};

const startInternal = (): void => {
  const ctx = getAudioContext();
  void ctx.resume();
  loadClickSamples();   // idempotent; any card can start the transport
  running = true;
  latency = readLatency();
  nextTime = ctx.currentTime + START_OFFSET_SEC;
  subIndex = 0;
  subsPerBeat = 1;
  beatCount = 0;
  beatInBar = 0;
  barIndex = 0;
  beatsPerBar = Math.max(1, useStore.getState().metronome.beatsPerMeasure);
  pending = [];
  useTransport.setState({ ...IDLE_POSITION, running: true, beatsPerBar });
  scan();
  startTicks(scan);
  ensureFrameLoop();
};

const stopInternal = (): void => {
  running = false;
  stopTicks();
  // Clicks inside the lookahead window are already queued on the audio
  // thread — cancel them so Stop is silent immediately.
  cancelScheduledClicks();
  pending = [];
  useTransport.setState(IDLE_POSITION);
};

export const isTransportRunning = (): boolean => running;

/** Restart from beat 0 without toggling `metronome.isPlaying` — used by Jam
 *  so a count-in always starts on a fresh bar. */
export const restartTransport = (): void => {
  stopInternal();
  startInternal();
};

let initialized = false;

/** Bind the transport to `metronome.isPlaying`. Call once at app start. */
export const initTransport = (): void => {
  if (initialized) return;
  initialized = true;
  useStore.subscribe((state, prev) => {
    const on = state.metronome.isPlaying;
    if (on === prev.metronome.isPlaying) return;
    if (on) startInternal();
    else stopInternal();
  });
  if (useStore.getState().metronome.isPlaying) startInternal();
};
