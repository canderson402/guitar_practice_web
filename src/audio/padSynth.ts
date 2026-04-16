// ---------------------------------------------------------------------------
// Oscillator-based pad synth.
//
// Per-voice architecture:
//   two detuned sawtooth oscs + one sub sine (octave down)
//     → lowpass filter
//     → per-voice gain with full ADSR envelope
//     → shared output
//
// Sustains indefinitely (no sample length to run out of), so ADSR actually
// works: attack blooms, decay slumps to sustain level, sustain holds, release
// fades out when noteOff is triggered.
//
// Chord changes = noteOff() + noteOn(). Old voices release while new voices
// attack → natural crossfade across the chord boundary.
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
  /** Detune in cents applied ±detune to the two saw oscillators. 0 = unison
   *  (thin), 5–15 = classic chorus, 25+ = honky. */
  detune: number;
  /** Lowpass filter cutoff in Hz. Higher = brighter. */
  cutoff: number;
  /** Per-voice peak gain (0–1) before envelope. Total output scales with
   *  the number of voices, so keep this low for polyphony. */
  gain: number;
}

interface Voice {
  midi: number;
  oscs: OscillatorNode[];
  voiceGain: GainNode;
  /** Stop time already scheduled (seconds, ctx time) — if another call wants
   *  to shorten it we can compare. Infinity = sustaining indefinitely. */
  stopsAt: number;
  /** The sustain-level this voice was built with. Saved so noteOff can
   *  explicitly anchor the release ramp from this value, instead of relying
   *  on the browser's "current value at time X" behavior (which is buggy
   *  across engines when scheduling ramps into the future). */
  sustainLevel: number;
}

export interface PadSynth {
  /** Schedule notes to start at `time`. All ADSR params live on opts. */
  noteOn: (midis: number[], time: number, opts: PadVoiceOpts) => void;
  /** Release every currently-held voice at `time` over `release` seconds.
   *  Voices move off the active list; further noteOffs leave them alone. */
  noteOff: (time: number, release: number) => void;
  /** Hard-stop every scheduled voice now, with a short anti-click fade.
   *  Use for Stop button / unmount. */
  panic: () => void;
  /** Tear down and detach from the graph. */
  dispose: () => void;
}

const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export const createPadSynth = (
  ctx: AudioContext,
  destination: AudioNode,
): PadSynth => {
  // Active (held or releasing) voices. Released voices linger here until
  // their oscillator.onended fires and cleans them up.
  const voices = new Set<Voice>();
  // Held voices — subset of `voices` that haven't been noteOff'd yet. These
  // are the ones noteOff operates on.
  let held = new Set<Voice>();

  const createVoice = (midi: number, startAt: number, opts: PadVoiceOpts): Voice => {
    const freq = midiToFreq(midi);

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.cutoff;
    filter.Q.value = 0.707;

    // Two detuned saws — the heart of the pad.
    const sawA = ctx.createOscillator();
    const sawB = ctx.createOscillator();
    sawA.type = 'sawtooth';
    sawB.type = 'sawtooth';
    sawA.frequency.value = freq;
    sawB.frequency.value = freq;
    sawA.detune.value = -opts.detune;
    sawB.detune.value = +opts.detune;

    // Sub sine one octave down — adds warmth / body.
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq / 2;

    // Trim each source so their sum stays in headroom.
    const sawMix = ctx.createGain();
    sawMix.gain.value = 0.45;
    const subMix = ctx.createGain();
    subMix.gain.value = 0.25;

    sawA.connect(sawMix);
    sawB.connect(sawMix);
    sub.connect(subMix);
    sawMix.connect(filter);
    subMix.connect(filter);
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

    sawA.start(startAt);
    sawB.start(startAt);
    sub.start(startAt);

    const voice: Voice = {
      midi,
      oscs: [sawA, sawB, sub],
      voiceGain,
      stopsAt: Infinity,
      sustainLevel,
    };

    // Schedule graph cleanup when the last osc ends.
    sub.onended = () => {
      voices.delete(voice);
      held.delete(voice);
      try {
        sawA.disconnect(); sawB.disconnect(); sub.disconnect();
        sawMix.disconnect(); subMix.disconnect();
        filter.disconnect(); voiceGain.disconnect();
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
    // Ramp to a tiny non-zero value — exponential can't hit 0, and the
    // oscillator stop() below cuts whatever's left.
    g.linearRampToValueAtTime(0.0001, time + release);

    voice.oscs.forEach(osc => {
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
    panic() {
      const t = ctx.currentTime;
      voices.forEach(v => releaseVoice(v, t, 0.1));
      held.clear();
    },
    dispose() {
      this.panic();
    },
  };
};
