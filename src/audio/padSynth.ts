// ---------------------------------------------------------------------------
// Oscillator-based pad synth with selectable patches.
//
// Per-voice architecture:
//   N oscillators (per the patch recipe; optional FM modulator per osc)
//     → lowpass filter (base cutoff × patch filter-envelope, shared LFO
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

/** One oscillator layer in a patch. */
export interface PatchOsc {
  type: OscillatorType;
  /** Semitone offset from the note (−12 = sub octave, 12 = octave up). */
  semitones: number;
  /** Multiplier on PadVoiceOpts.detune, −1..1. */
  spread: number;
  /** Mix level of this layer. */
  level: number;
  /** Optional FM: a sine modulator at `ratio` × freq, index decaying from
   *  `index` to `sustainIndex` over `decay` seconds. Gives tine / bell
   *  attacks that mellow as the note holds. */
  fm?: { ratio: number; index: number; sustainIndex: number; decay: number };
}

export interface Patch {
  id: string;
  name: string;
  oscs: PatchOsc[];
  /** Filter resonance. */
  q: number;
  /** Filter envelope: cutoff starts at `envAmount` × base and settles to
   *  base over `envDecay` seconds. 1 = no envelope. */
  envAmount: number;
  envDecay: number;
  /** Shared filter LFO — rate in Hz, depth in cents of cutoff. */
  lfoRate: number;
  lfoDepth: number;
  /** Starting slider values when this patch is picked. */
  defaults: Omit<PadVoiceOpts, 'gain'> & { reverbAmount: number };
}

export const PATCHES: Patch[] = [
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
      detune: 9, cutoff: 1300, reverbAmount: 0.75,
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
      detune: 14, cutoff: 2600, reverbAmount: 0.8,
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
      detune: 4, cutoff: 5000, reverbAmount: 0.45,
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
      detune: 6, cutoff: 6000, reverbAmount: 1.0,
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
      detune: 12, cutoff: 2000, reverbAmount: 0.65,
    },
  },
];

export const DEFAULT_PATCH_ID = 'warm';

export const getPatch = (id: string): Patch =>
  PATCHES.find(p => p.id === id) ?? PATCHES[0];

interface VoiceOsc {
  osc: OscillatorNode;
  spread: number;
}

interface Voice {
  midi: number;
  oscs: VoiceOsc[];
  /** Every source node (carriers + FM modulators) — all get stopped. */
  sources: OscillatorNode[];
  filter: BiquadFilterNode;
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
  /** Switch the oscillator recipe for subsequent noteOns. */
  setPatch: (patch: Patch) => void;
  /** Hard-stop every scheduled voice now, with a short anti-click fade.
   *  Use for Stop button / unmount. */
  panic: () => void;
  /** Tear down and detach from the graph. */
  dispose: () => void;
}

const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// Smoothing time-constant for live slider updates (seconds).
const LIVE_TC = 0.05;

export const createPadSynth = (
  ctx: AudioContext,
  destination: AudioNode,
  initialPatch: Patch = getPatch(DEFAULT_PATCH_ID),
): PadSynth => {
  let patch = initialPatch;

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

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = patch.q;
    filter.frequency.setValueAtTime(opts.cutoff * patch.envAmount, startAt);
    if (patch.envAmount !== 1) {
      filter.frequency.setTargetAtTime(opts.cutoff, startAt, patch.envDecay / 3);
    }
    lfoDepth.connect(filter.detune);

    const oscs: VoiceOsc[] = [];
    const sources: OscillatorNode[] = [];
    const nodes: AudioNode[] = [filter, voiceGain];

    for (const layer of patch.oscs) {
      const oscFreq = freq * Math.pow(2, layer.semitones / 12);
      const osc = ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.value = oscFreq;
      osc.detune.value = layer.spread * opts.detune;

      const mix = ctx.createGain();
      mix.gain.value = layer.level;
      osc.connect(mix);
      mix.connect(filter);
      nodes.push(osc, mix);

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

      oscs.push({ osc, spread: layer.spread });
      sources.push(osc);
      osc.start(startAt);
    }

    filter.connect(voiceGain);
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
      midi, oscs, sources, filter, voiceGain, peak,
      stopsAt: Infinity,
      sustainLevel,
    };

    // Schedule graph cleanup when the last carrier ends.
    sources[sources.length - 1].onended = () => {
      voices.delete(voice);
      held.delete(voice);
      try {
        lfoDepth.disconnect(filter.detune);
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
        v.filter.frequency.cancelScheduledValues(now);
        v.filter.frequency.setTargetAtTime(opts.cutoff, now, LIVE_TC);
        v.oscs.forEach(({ osc, spread }) =>
          osc.detune.setTargetAtTime(spread * opts.detune, now, LIVE_TC),
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
    setPatch(next) {
      patch = next;
      applyLfo();
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
