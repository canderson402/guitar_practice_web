// ---------------------------------------------------------------------------
// Pad synth with selectable patches.
//
// Per-voice architecture:
//   N layers (per the patch recipe), each one of:
//     - an oscillator (optional FM modulator),
//     - a supersaw: 7 detuned saws, each from a random phase, panned wide,
//     - a PADsynth wavetable (see padTable.ts): a stereo looping sample,
//       started from a random point in the loop
//   + optional slow random pitch drift per voice (so held notes breathe)
//     → lowpass filter (2- or 4-pole) (base cutoff × patch filter-envelope, shared LFO
//       sweeping filter.detune for slow movement)
//     → per-voice gain with full ADSR envelope
//     → shared output
//
// Sustains indefinitely (no sample length to run out of), so ADSR actually
// works: attack blooms, decay slumps to sustain level, sustain holds, release
// fades out when noteOff is triggered.
//
// Chord changes = noteOff() + noteOn(). Old voices release while new voices
// attack → natural crossfade across the chord boundary.
//
// `update()` retunes every held voice in place (cutoff, detune, sustain) so
// slider moves are heard immediately instead of at the next chord.
// ---------------------------------------------------------------------------

import { buildPadTable, tableBaseFor, sawPhaseCoefficients, SUPERSAW_OFFSETS } from './padTable';
import type { PadTableSpec } from './padTable';

export interface PadVoiceOpts {
  /** Attack ramp in seconds (silence → peak). */
  attack: number;
  /** Decay in seconds (peak → sustain level). */
  decay: number;
  /** Sustain level as a fraction of peak (0–1). */
  sustain: number;
  /** Release ramp in seconds, triggered by noteOff. */
  release: number;
  /** Detune spread in cents. Each osc's `spread` (−1..1) scales this, so 0 =
   *  unison (thin), 5–15 = classic chorus, 25+ = honky. */
  detune: number;
  /** Lowpass filter cutoff in Hz. Higher = brighter. */
  cutoff: number;
  /** Per-voice peak gain (0–1) before envelope. Total output scales with
   *  the number of voices, so keep this low for polyphony. */
  gain: number;
}

/** One layer in a patch: a plain oscillator, a supersaw (7 saws), or the
 *  patch's PADsynth wavetable. */
export interface PatchOsc {
  type: OscillatorType | 'supersaw' | 'table';
  /** Semitone offset from the note (−12 = sub octave, 12 = octave up). */
  semitones: number;
  /** Multiplier on PadVoiceOpts.detune, −1..1. */
  spread: number;
  /** Mix level of this layer. */
  level: number;
  /** Optional FM (oscillator layers only): a sine modulator at `ratio` × freq, index decaying from
   *  `index` to `sustainIndex` over `decay` seconds. Gives tine / bell
   *  attacks that mellow as the note holds. */
  fm?: { ratio: number; index: number; sustainIndex: number; decay: number };
}

export interface Patch {
  id: string;
  name: string;
  oscs: PatchOsc[];
  /** The PADsynth wavetable that `table` layers play. */
  table?: PadTableSpec;
  /** Filter resonance. */
  q: number;
  /** 4 = two filters in series (steeper, smoother darkening). Default 2. */
  poles?: 2 | 4;
  /** Slow random pitch drift per voice, in cents (0 = none). */
  drift?: number;
  /** Filter envelope: cutoff starts at `envAmount` × base and settles to
   *  base over `envDecay` seconds. 1 = no envelope. */
  envAmount: number;
  envDecay: number;
  /** Shared filter LFO — rate in Hz, depth in cents of cutoff. */
  lfoRate: number;
  lfoDepth: number;
  /** Starting slider values when this patch is picked. */
  defaults: Omit<PadVoiceOpts, 'gain'>;
}

export const PATCHES: Patch[] = [
  {
    id: 'lush',
    name: 'Lush Pad',
    table: { amp: n => Math.pow(n, -1.2), harmonics: 48, bandwidth: 35, bwScale: 1 },
    oscs: [
      { type: 'table', semitones: 0, spread: -1, level: 0.7 },
      { type: 'table', semitones: 0, spread: 1, level: 0.7 },
      { type: 'sine', semitones: -12, spread: 0, level: 0.12 },
    ],
    q: 0.5,
    drift: 4,
    envAmount: 1.3,
    envDecay: 2,
    lfoRate: 0.08,
    lfoDepth: 300,
    defaults: {
      attack: 0.8, decay: 2.0, sustain: 0.9, release: 2.5,
      detune: 6, cutoff: 2400,
    },
  },
  {
    id: 'choir',
    name: 'Choir',
    // An "ah" vowel: formants at fixed frequencies, whatever the pitch.
    table: {
      amp: (n, hz) => Math.pow(n, -0.7) * (0.04
        + Math.exp(-(((hz - 700) / 130) ** 2))
        + 0.7 * Math.exp(-(((hz - 1150) / 150) ** 2))
        + 0.25 * Math.exp(-(((hz - 2800) / 250) ** 2))),
      harmonics: 64, bandwidth: 55, bwScale: 0.9,
    },
    oscs: [
      { type: 'table', semitones: 0, spread: 0, level: 1.0 },
    ],
    q: 0.5,
    drift: 3,
    envAmount: 1,
    envDecay: 0.1,
    lfoRate: 0.1,
    lfoDepth: 150,
    defaults: {
      attack: 1.2, decay: 2.0, sustain: 0.95, release: 2.5,
      detune: 0, cutoff: 4500,
    },
  },
  {
    id: 'ensemble',
    name: 'String Ensemble',
    table: { amp: n => 1 / n, harmonics: 60, bandwidth: 22, bwScale: 1.15 },
    oscs: [
      { type: 'table', semitones: 0, spread: -1, level: 0.6 },
      { type: 'table', semitones: 0, spread: 1, level: 0.6 },
    ],
    q: 0.6,
    poles: 4,
    drift: 5,
    envAmount: 1.2,
    envDecay: 1.5,
    lfoRate: 0.2,
    lfoDepth: 120,
    defaults: {
      attack: 0.4, decay: 1.5, sustain: 0.9, release: 1.6,
      detune: 8, cutoff: 3200,
    },
  },
  {
    id: 'glasspad',
    name: 'Glass Pad',
    // Octave partials, upper ones shimmering more.
    table: {
      amp: n => ({ 1: 1, 2: 0.6, 3: 0.15, 4: 0.45, 6: 0.1, 8: 0.3, 12: 0.05, 16: 0.15 } as Record<number, number>)[n] ?? 0,
      harmonics: 16, bandwidth: 12, bwScale: 1.6,
    },
    oscs: [
      { type: 'table', semitones: 0, spread: -1, level: 0.7 },
      { type: 'table', semitones: 12, spread: 1, level: 0.25 },
    ],
    q: 0.5,
    drift: 3,
    envAmount: 1,
    envDecay: 0.1,
    lfoRate: 0.15,
    lfoDepth: 200,
    defaults: {
      attack: 0.3, decay: 3.0, sustain: 0.75, release: 3.0,
      detune: 5, cutoff: 7000,
    },
  },
  {
    id: 'supersaw',
    name: 'Supersaw',
    oscs: [
      { type: 'supersaw', semitones: 0, spread: 1, level: 0.9 },
      { type: 'sine', semitones: -12, spread: 0, level: 0.18 },
    ],
    q: 0.9,
    poles: 4,
    drift: 3,
    envAmount: 1.6,
    envDecay: 1.5,
    lfoRate: 0.1,
    lfoDepth: 350,
    defaults: {
      attack: 0.25, decay: 2.0, sustain: 0.85, release: 1.8,
      detune: 18, cutoff: 2800,
    },
  },
  {
    id: 'warm',
    name: 'Warm Pad',
    oscs: [
      { type: 'sawtooth', semitones: 0, spread: -1, level: 0.3 },
      { type: 'sawtooth', semitones: 0, spread: 1, level: 0.3 },
      { type: 'triangle', semitones: 0, spread: 0, level: 0.35 },
      { type: 'sine', semitones: -12, spread: 0, level: 0.25 },
    ],
    q: 1.2,
    envAmount: 1.8,
    envDecay: 1.2,
    lfoRate: 0.12,
    lfoDepth: 450,
    defaults: {
      attack: 0.03, decay: 2.0, sustain: 0.8, release: 1.2,
      detune: 9, cutoff: 1300,
    },
  },
  {
    id: 'strings',
    name: 'Soft Strings',
    oscs: [
      { type: 'sawtooth', semitones: 0, spread: -1, level: 0.22 },
      { type: 'sawtooth', semitones: 0, spread: 0, level: 0.22 },
      { type: 'sawtooth', semitones: 0, spread: 1, level: 0.22 },
      { type: 'sawtooth', semitones: 12, spread: 0.5, level: 0.08 },
    ],
    q: 0.6,
    envAmount: 1.3,
    envDecay: 0.8,
    lfoRate: 0.25,
    lfoDepth: 200,
    defaults: {
      attack: 0.12, decay: 1.5, sustain: 0.9, release: 1.0,
      detune: 14, cutoff: 2600,
    },
  },
  {
    id: 'keys',
    name: 'Electric Piano',
    oscs: [
      { type: 'sine', semitones: 0, spread: 0, level: 0.6,
        fm: { ratio: 1, index: 3.5, sustainIndex: 0.4, decay: 0.9 } },
      { type: 'sine', semitones: 12, spread: 1, level: 0.12,
        fm: { ratio: 14, index: 1.2, sustainIndex: 0, decay: 0.08 } },
    ],
    q: 0.707,
    envAmount: 1,
    envDecay: 0.1,
    lfoRate: 0,
    lfoDepth: 0,
    defaults: {
      attack: 0.005, decay: 1.6, sustain: 0.35, release: 0.8,
      detune: 4, cutoff: 5000,
    },
  },
  {
    id: 'glass',
    name: 'Glass Bells',
    oscs: [
      { type: 'sine', semitones: 0, spread: 0, level: 0.45,
        fm: { ratio: 3.5, index: 2.5, sustainIndex: 0.3, decay: 1.5 } },
      { type: 'sine', semitones: 12, spread: 1, level: 0.2 },
      { type: 'triangle', semitones: 0, spread: -1, level: 0.2 },
    ],
    q: 0.707,
    envAmount: 1,
    envDecay: 0.1,
    lfoRate: 0.2,
    lfoDepth: 150,
    defaults: {
      attack: 0.01, decay: 3.0, sustain: 0.45, release: 1.8,
      detune: 6, cutoff: 6000,
    },
  },
  {
    id: 'classic',
    name: 'Classic Saw',
    oscs: [
      { type: 'sawtooth', semitones: 0, spread: -1, level: 0.45 },
      { type: 'sawtooth', semitones: 0, spread: 1, level: 0.45 },
      { type: 'sine', semitones: -12, spread: 0, level: 0.25 },
    ],
    q: 0.707,
    envAmount: 1,
    envDecay: 0.1,
    lfoRate: 0,
    lfoDepth: 0,
    defaults: {
      attack: 0.05, decay: 1.5, sustain: 0.8, release: 1.0,
      detune: 12, cutoff: 2000,
    },
  },
];

export const DEFAULT_PATCH_ID = 'lush';

export const getPatch = (id: string): Patch =>
  PATCHES.find(p => p.id === id) ?? PATCHES[0];

interface VoiceOsc {
  /** The detune param the Detune slider moves (× spread). */
  detune: AudioParam;
  spread: number;
}

interface Voice {
  midi: number;
  oscs: VoiceOsc[];
  /** Every source node (carriers, FM modulators, drift) — all get stopped. */
  sources: AudioScheduledSourceNode[];
  /** One, or two in series for a 4-pole patch. */
  filters: BiquadFilterNode[];
  voiceGain: GainNode;
  /** Peak gain this voice was built with (sustain = peak × sustain). */
  peak: number;
  /** Stop time already scheduled (seconds, ctx time) — if another call wants
   *  to shorten it we can compare. Infinity = sustaining indefinitely. */
  stopsAt: number;
  /** The sustain-level this voice is holding at. Saved so noteOff can
   *  explicitly anchor the release ramp from this value, instead of relying
   *  on the browser's "current value at time X" behavior (which is buggy
   *  across engines when scheduling ramps into the future). */
  sustainLevel: number;
}

export interface PadSynth {
  /** Schedule notes to start at `time` using the current patch. */
  noteOn: (midis: number[], time: number, opts: PadVoiceOpts) => void;
  /** Release every currently-held voice at `time` over `release` seconds.
   *  Voices move off the active list; further noteOffs leave them alone. */
  noteOff: (time: number, release: number) => void;
  /** Retune held voices now — cutoff, detune and sustain apply live. */
  update: (opts: Pick<PadVoiceOpts, 'cutoff' | 'detune' | 'sustain'>) => void;
  /** Switch sound for subsequent noteOns. A wavetable sound whose tables
   *  aren't built yet takes over once they are (built in the background, so
   *  playback never stalls); `onReady` fires when the new sound is live. */
  setPatch: (patch: Patch, onReady?: () => void) => void;
  /** Build the current sound's tables now — call before starting playback. */
  prepare: () => void;
  /** Hard-stop every scheduled voice now, with a short anti-click fade.
   *  Use for Stop button / unmount. */
  panic: () => void;
  /** Tear down and detach from the graph. */
  dispose: () => void;
}

const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// ---- Shared, per-context caches ----

const TABLE_SIZE = 1 << 17;   // ≈ 2.7 s loop at 48 kHz
const tableCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

/** The patch's stereo wavetable for the octave starting at `base` (MIDI),
 *  built on first use: two decorrelated tables, one per channel. */
const getTable = (ctx: BaseAudioContext, patch: Patch, base: number): AudioBuffer => {
  let cache = tableCache.get(ctx);
  if (!cache) tableCache.set(ctx, (cache = new Map()));
  const key = `${patch.id}:${base}`;
  let buf = cache.get(key);
  if (!buf) {
    buf = ctx.createBuffer(2, TABLE_SIZE, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buildPadTable(patch.table!, { size: TABLE_SIZE, sampleRate: ctx.sampleRate, baseFreq: midiToFreq(base), seed: base * 2 + ch + 1 });
      buf.getChannelData(ch).set(data);
    }
    cache.set(key, buf);
  }
  return buf;
};

/** The nearest already-built table to `base`, or null if none is built. A
 *  note outside the prepared octaves borrows one rather than stalling the
 *  scheduler to build its own. */
const nearestTable = (ctx: BaseAudioContext, patch: Patch, base: number): { buf: AudioBuffer; base: number } | null => {
  const cache = tableCache.get(ctx);
  let best: { buf: AudioBuffer; base: number } | null = null;
  cache?.forEach((buf, key) => {
    const [id, b] = key.split(':');
    if (id !== patch.id) return;
    const at = Number(b);
    if (!best || Math.abs(at - base) < Math.abs(best.base - base)) best = { buf, base: at };
  });
  return best;
};

// Octaves the Jam's voicings use (bass note to chord top).
const WARM_BASES = [36, 48, 60, 72];
const isBuilt = (ctx: BaseAudioContext, patch: Patch, base: number) => !!tableCache.get(ctx)?.has(`${patch.id}:${base}`);
const tablesReady = (ctx: BaseAudioContext, patch: Patch) => !patch.table || WARM_BASES.every(b => isBuilt(ctx, patch, b));

/** Build a patch's tables in the background, one octave per task (~60 ms
 *  each — well inside the scheduler's 100 ms lookahead), then call `done`. */
const warmTables = (ctx: BaseAudioContext, patch: Patch, done: () => void = () => {}): void => {
  const todo = patch.table ? WARM_BASES.filter(b => !isBuilt(ctx, patch, b)) : [];
  const step = (i: number) => {
    if (i >= todo.length) { done(); return; }
    setTimeout(() => { getTable(ctx, patch, todo[i]); step(i + 1); }, 30);
  };
  step(0);
};

const SAW_PHASES = 8;
const sawCache = new WeakMap<BaseAudioContext, PeriodicWave[]>();
/** A sawtooth starting at a random one of a few phases. */
const randomSaw = (ctx: BaseAudioContext): PeriodicWave => {
  let waves = sawCache.get(ctx);
  if (!waves) {
    waves = Array.from({ length: SAW_PHASES }, (_, i) => {
      const { real, imag } = sawPhaseCoefficients((i / SAW_PHASES) * 2 * Math.PI, 128);
      return ctx.createPeriodicWave(real, imag, { disableNormalization: true });
    });
    sawCache.set(ctx, waves);
  }
  return waves[Math.floor(Math.random() * waves.length)];
};
// Center saw loudest; equal power overall (Σ w² = 1).
const SUPERSAW_WEIGHTS = (() => {
  const w = SUPERSAW_OFFSETS.map(o => (o === 0 ? 1 : 0.75));
  const norm = Math.sqrt(w.reduce((a, x) => a + x * x, 0));
  return w.map(x => x / norm);
})();

// Smoothing time-constant for live slider updates (seconds).
const LIVE_TC = 0.05;

export const createPadSynth = (
  ctx: AudioContext,
  destination: AudioNode,
  initialPatch: Patch = getPatch(DEFAULT_PATCH_ID),
): PadSynth => {
  let patch = initialPatch;
  let pending: Patch | null = null;
  warmTables(ctx, patch);

  // Active (held or releasing) voices. Released voices linger here until
  // their oscillator.onended fires and cleans them up.
  const voices = new Set<Voice>();
  // Held voices — subset of `voices` that haven't been noteOff'd yet. These
  // are the ones noteOff / update operate on.
  let held = new Set<Voice>();

  // One shared LFO sweeps every voice's filter.detune — slow movement that
  // keeps held chords from sounding static.
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  const lfoDepth = ctx.createGain();
  lfo.connect(lfoDepth);
  lfo.start();
  const applyLfo = () => {
    lfo.frequency.setTargetAtTime(Math.max(patch.lfoRate, 0.01), ctx.currentTime, 0.1);
    lfoDepth.gain.setTargetAtTime(patch.lfoDepth, ctx.currentTime, 0.1);
  };
  applyLfo();

  const createVoice = (midi: number, startAt: number, opts: PadVoiceOpts): Voice => {
    const freq = midiToFreq(midi);

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;

    const filters: BiquadFilterNode[] = [];
    for (let i = 0; i < (patch.poles === 4 ? 2 : 1); i++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = patch.q;
      filter.frequency.setValueAtTime(opts.cutoff * patch.envAmount, startAt);
      if (patch.envAmount !== 1) {
        filter.frequency.setTargetAtTime(opts.cutoff, startAt, patch.envDecay / 3);
      }
      lfoDepth.connect(filter.detune);
      if (filters.length) filters[filters.length - 1].connect(filter);
      filters.push(filter);
    }
    const filterIn = filters[0];

    const oscs: VoiceOsc[] = [];
    const sources: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [...filters, voiceGain];

    // Slow random drift, different per voice, on every layer's pitch.
    let drift: GainNode | null = null;
    if (patch.drift) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06 + Math.random() * 0.16;
      drift = ctx.createGain();
      drift.gain.value = patch.drift;
      lfo.connect(drift);
      nodes.push(lfo, drift);
      sources.push(lfo);
      lfo.start(startAt);
    }
    const addSource = (src: AudioScheduledSourceNode, detune: AudioParam, spread: number, out: AudioNode, offset?: number) => {
      detune.value = spread * opts.detune;
      drift?.connect(detune);
      src.connect(out);
      nodes.push(src);
      oscs.push({ detune, spread });
      sources.push(src);
      if (offset === undefined) src.start(startAt);
      else (src as AudioBufferSourceNode).start(startAt, offset);
    };

    for (const layer of patch.oscs) {
      const layerMidi = midi + layer.semitones;
      const oscFreq = freq * Math.pow(2, layer.semitones / 12);
      const mix = ctx.createGain();
      mix.gain.value = layer.level;
      mix.connect(filterIn);
      nodes.push(mix);

      if (layer.type === 'table' && patch.table) {
        const want = tableBaseFor(layerMidi);
        // Prepared octaves play their own table; others borrow the nearest built one.
        const table = WARM_BASES.includes(want) || isBuilt(ctx, patch, want) ? null : nearestTable(ctx, patch, want);
        const base = table?.base ?? want;
        const src = ctx.createBufferSource();
        src.buffer = table?.buf ?? getTable(ctx, patch, want);
        src.loop = true;
        src.playbackRate.value = midiToFreq(layerMidi) / midiToFreq(base);
        addSource(src, src.detune, layer.spread, mix, Math.random() * src.buffer.duration);
        continue;
      }

      if (layer.type === 'supersaw') {
        SUPERSAW_OFFSETS.forEach((offset, i) => {
          const osc = ctx.createOscillator();
          osc.setPeriodicWave(randomSaw(ctx));
          osc.frequency.value = oscFreq;
          const w = ctx.createGain();
          w.gain.value = SUPERSAW_WEIGHTS[i];
          const pan = ctx.createStereoPanner();
          pan.pan.value = offset * 0.8;
          w.connect(pan);
          pan.connect(mix);
          nodes.push(w, pan);
          addSource(osc, osc.detune, offset * layer.spread, w);
        });
        continue;
      }

      const osc = ctx.createOscillator();
      osc.type = layer.type === 'table' ? 'sine' : layer.type;
      osc.frequency.value = oscFreq;

      if (layer.fm) {
        const mod = ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = oscFreq * layer.fm.ratio;
        const modGain = ctx.createGain();
        // FM index → frequency deviation in Hz.
        modGain.gain.setValueAtTime(layer.fm.index * oscFreq, startAt);
        modGain.gain.setTargetAtTime(
          layer.fm.sustainIndex * oscFreq, startAt, layer.fm.decay / 3,
        );
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        nodes.push(mod, modGain);
        sources.push(mod);
        mod.start(startAt);
      }

      addSource(osc, osc.detune, layer.spread, mix);
    }

    filters[filters.length - 1].connect(voiceGain);
    voiceGain.connect(destination);

    // ADSR on voiceGain — linear ramps (predictable, reads correctly on
    // slider changes). Release is scheduled later by noteOff.
    const peak = Math.max(opts.gain, 0.0001);
    const sustainLevel = Math.max(peak * opts.sustain, 0.0001);
    const g = voiceGain.gain;
    g.setValueAtTime(0, startAt);
    g.linearRampToValueAtTime(peak, startAt + opts.attack);
    g.linearRampToValueAtTime(sustainLevel, startAt + opts.attack + opts.decay);
    // Holds at sustainLevel indefinitely until noteOff.

    const voice: Voice = {
      midi, oscs, sources, filters, voiceGain, peak,
      stopsAt: Infinity,
      sustainLevel,
    };

    // Schedule graph cleanup when the last carrier ends.
    sources[sources.length - 1].onended = () => {
      voices.delete(voice);
      held.delete(voice);
      try {
        filters.forEach(f => lfoDepth.disconnect(f.detune));
        nodes.forEach(n => n.disconnect());
      } catch { /* already torn down */ }
    };

    return voice;
  };

  const releaseVoice = (voice: Voice, time: number, release: number): void => {
    const stopAt = time + release + 0.05;
    if (stopAt >= voice.stopsAt) return;   // already stopping sooner
    voice.stopsAt = stopAt;

    const g = voice.voiceGain.gain;
    // Cancel any automation at/after `time` (e.g. the tail of decay if
    // we're releasing mid-decay).
    g.cancelScheduledValues(time);
    // Explicitly anchor the envelope at `time` to the held sustain level.
    // Without this, the linearRamp below would interpolate from the END of
    // the decay ramp (the previous automation event) instead of from our
    // actual hold value — meaning the release slider would have almost no
    // audible effect. See comment on Voice.sustainLevel.
    g.setValueAtTime(voice.sustainLevel, time);
    // Exponential-shaped fade (≈ −43 dB by `time + release`). A linear ramp
    // keeps the old chord near full loudness for the first beat or so of
    // the new chord, which makes chord changes sound a beat late.
    g.setTargetAtTime(0.0001, time, Math.max(release, 0.01) / 5);

    voice.sources.forEach(osc => {
      try { osc.stop(stopAt); } catch { /* already stopped */ }
    });
  };

  return {
    noteOn(midis, time, opts) {
      for (const midi of midis) {
        const voice = createVoice(midi, time, opts);
        voices.add(voice);
        held.add(voice);
      }
    },
    noteOff(time, release) {
      const toRelease = held;
      held = new Set();
      toRelease.forEach(v => releaseVoice(v, time, release));
    },
    update(opts) {
      const now = ctx.currentTime;
      held.forEach(v => {
        v.filters.forEach(f => {
          f.frequency.cancelScheduledValues(now);
          f.frequency.setTargetAtTime(opts.cutoff, now, LIVE_TC);
        });
        v.oscs.forEach(({ detune, spread }) =>
          detune.setTargetAtTime(spread * opts.detune, now, LIVE_TC),
        );
        const nextSustain = Math.max(v.peak * opts.sustain, 0.0001);
        if (nextSustain !== v.sustainLevel) {
          v.sustainLevel = nextSustain;
          const g = v.voiceGain.gain;
          g.cancelScheduledValues(now);
          g.setValueAtTime(g.value, now);
          g.setTargetAtTime(nextSustain, now, LIVE_TC);
        }
      });
    },
    setPatch(next, onReady) {
      if (tablesReady(ctx, next)) {
        pending = null;
        patch = next;
        applyLfo();
        onReady?.();
        return;
      }
      pending = next;
      warmTables(ctx, next, () => {
        if (pending !== next) return;   // switched again meanwhile
        pending = null;
        patch = next;
        applyLfo();
        onReady?.();
      });
    },
    prepare() {
      const p = pending ?? patch;
      if (p.table) WARM_BASES.forEach(b => getTable(ctx, p, b));
      if (pending) { patch = pending; pending = null; applyLfo(); }
    },
    panic() {
      const t = ctx.currentTime;
      voices.forEach(v => releaseVoice(v, t, 0.1));
      held.clear();
    },
    dispose() {
      this.panic();
      try { lfo.stop(); lfo.disconnect(); lfoDepth.disconnect(); } catch { /* noop */ }
    },
  };
};
