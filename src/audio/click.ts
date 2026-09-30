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
let sampleLoadStarted = false;

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

/** Kick off async ASRX sample loads. Safe to call repeatedly — only the
 *  first call does work. Samples resolve into module state when ready; the
 *  synth click path doesn't need them so calls made before loading complete
 *  still produce sound (just the synth variety). */
export const loadClickSamples = (): void => {
  if (sampleLoadStarted) return;
  sampleLoadStarted = true;

  const ctx = getAudioContext();
  const publicUrl = process.env.PUBLIC_URL ?? '';

  const loadSample = async (url: string): Promise<AudioBuffer> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
    return ctx.decodeAudioData(await response.arrayBuffer());
  };

  loadSample(`${publicUrl}/ASRX_UP.wav`)
    .then(buffer => { asrxUpBuffer = buffer; })
    .catch(err => console.error('Failed to load ASRX_UP.wav:', err));

  loadSample(`${publicUrl}/ASRX_Down.wav`)
    .then(buffer => { asrxDownBuffer = buffer; })
    .catch(err => console.error('Failed to load ASRX_Down.wav:', err));
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

  if (opts.soundType === 'asrx') {
    const buffer = firstBeatEmphasized ? asrxDownBuffer : asrxUpBuffer;
    if (!buffer) return;   // sample still loading — fall through silently
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
