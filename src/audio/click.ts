// ---------------------------------------------------------------------------
// Shared metronome-click scheduler.
//
// Schedules a single click at a sample-accurate AudioContext time through the
// shared audio engine. Both the Metronome component and the Jam scheduler
// use this — guarantees they stay on the same clock and never drift relative
// to each other.
//
// All samples + state live at module scope so loading only happens once.
// ---------------------------------------------------------------------------

import { getAudioContext, getMasterGain } from './engine';

let asrxUpBuffer: AudioBuffer | null = null;
let asrxDownBuffer: AudioBuffer | null = null;

// Every click routes through one bus so volume changes apply instantly —
// even to clicks already scheduled inside the lookahead window.
let clickBus: GainNode | null = null;
let clickVolume = 1;

const getClickBus = (): GainNode => {
  if (clickBus) return clickBus;
  const ctx = getAudioContext();
  clickBus = ctx.createGain();
  clickBus.gain.value = clickVolume;
  clickBus.connect(getMasterGain());
  return clickBus;
};

/** Metronome click volume, 0–1. Applies immediately. */
export const setClickVolume = (value: number): void => {
  clickVolume = Math.max(0, Math.min(1, value));
  const bus = getClickBus();
  bus.gain.setTargetAtTime(clickVolume, bus.context.currentTime, 0.01);
};

const publicUrl = () => process.env.PUBLIC_URL ?? '';
const SAMPLE_FILES = { up: 'ASRX_UP.wav', down: 'ASRX_Down.wav' } as const;

// The sample files' bytes, fetched at app start (no audio needed) so the
// first Play doesn't wait on the network.
let prefetched: Promise<Record<keyof typeof SAMPLE_FILES, ArrayBuffer>> | null = null;

/** Download the click samples (bytes only — no AudioContext is created).
 *  Call once at app start. */
export const prefetchClickSamples = (): Promise<Record<keyof typeof SAMPLE_FILES, ArrayBuffer>> => {
  prefetched ??= (async () => {
    const get = async (file: string) => {
      const response = await fetch(`${publicUrl()}/${file}`);
      if (!response.ok) throw new Error(`Failed to load ${file}: ${response.status}`);
      return response.arrayBuffer();
    };
    const [up, down] = await Promise.all([get(SAMPLE_FILES.up), get(SAMPLE_FILES.down)]);
    return { up, down };
  })();
  return prefetched;
};

let loading: Promise<void> | null = null;

/** Decode the ASRX click samples (downloading them if they weren't
 *  prefetched). Safe to call repeatedly. Resolves when they're ready — or
 *  failed, in which case the synth click stands in. */
export const loadClickSamples = (): Promise<void> => {
  if (loading) return loading;
  const ctx = getAudioContext();
  loading = prefetchClickSamples()
    // decodeAudioData detaches its buffer; decode copies so a retry still works.
    .then(({ up, down }) => Promise.all([ctx.decodeAudioData(up.slice(0)), ctx.decodeAudioData(down.slice(0))]))
    .then(([up, down]) => { asrxUpBuffer = up; asrxDownBuffer = down; })
    .catch(err => { console.error('Failed to load the click samples:', err); });
  return loading;
};

// Clicks scheduled but not yet sounded. The transport schedules ~100 ms
// ahead, so on Stop these would otherwise still play one extra click.
const pendingClicks = new Map<AudioScheduledSourceNode, number>();

const track = (source: AudioScheduledSourceNode, startAt: number): void => {
  pendingClicks.set(source, startAt);
  source.onended = () => { pendingClicks.delete(source); };
};

/** Cancel every click scheduled to start in the future. Clicks already
 *  sounding are left to finish (cutting them mid-sample would pop). */
export const cancelScheduledClicks = (): void => {
  const now = getAudioContext().currentTime;
  pendingClicks.forEach((startAt, source) => {
    if (startAt <= now) return;
    try {
      source.stop();          // stop before start time → never plays
      source.disconnect();
    } catch { /* already stopped */ }
    pendingClicks.delete(source);
  });
};

export interface ClickOpts {
  /** 'synth' = oscillator beep, 'asrx' = sampled block hits. */
  soundType: 'synth' | 'asrx';
  /** If true, the scheduler silently skips this click (still a no-op, not
   *  an error — callers can stay simple). */
  muted: boolean;
  /** Beat is a downbeat of a subdivision group (accent vs. off-beat). */
  isAccent: boolean;
  /** Beat is the first beat of the measure. */
  isFirstBeat: boolean;
  /** If true and isFirstBeat, use the "down" / higher-pitched sound. */
  emphasizeFirstBeat: boolean;
}

/**
 * Schedule exactly one click at AudioContext time `time`. `time` may be in
 * the future (up to the scheduler lookahead) — the audio thread fires it
 * precisely on the dot.
 */
export const scheduleClick = (time: number, opts: ClickOpts): void => {
  if (opts.muted) return;

  const ctx = getAudioContext();
  const dest = getClickBus();
  const firstBeatEmphasized = opts.emphasizeFirstBeat && opts.isFirstBeat;

  const buffer = firstBeatEmphasized ? asrxDownBuffer : asrxUpBuffer;
  // While the samples are still loading, the synth click below stands in.
  if (opts.soundType === 'asrx' && buffer) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(dest);
    gain.gain.value = firstBeatEmphasized ? 0.6 : 0.4;
    source.start(time);
    track(source, time);
    return;
  }

  // Synth click — brief oscillator burst with exponential decay.
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(dest);

  if (firstBeatEmphasized)      osc.frequency.value = 1760;  // high A
  else if (opts.isAccent)        osc.frequency.value = 1320;  // E above high C
  else                            osc.frequency.value = 1056;  // C above high C

  gain.gain.setValueAtTime(firstBeatEmphasized ? 0.4 : 0.3, time);
  osc.start(time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  osc.stop(time + 0.02);
  track(osc, time);
};
