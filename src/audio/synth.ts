import { getAudioContext, getMasterGain } from './engine';
import { SynthOpts } from './types';
import { getInstrument, midiToNoteName } from './soundfont';

// ---------------------------------------------------------------------------
// Instrument-agnostic note/chord player. Tries SoundFont samples first for
// realistic instrument sounds; falls back to an oscillator synth while samples
// are still loading (first few seconds of the session).
//
// Public API unchanged: `playNote(midi, duration, startTime?)`.
// ---------------------------------------------------------------------------

const DEFAULTS = {
  gain: 0.25,
  waveform: 'sawtooth' as OscillatorType,
  brightness: 0.5,
  instrument: 'electric_piano_1',
};

/** Convert a MIDI note number to frequency in Hz. */
const midiToFreq = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/**
 * Schedule a single note.
 *
 * @param midi        MIDI note number (A4 = 69).
 * @param duration    Note length in seconds (after attack + decay tail).
 * @param startTime   AudioContext time to start. Omit to play now.
 * @param opts        Optional tone shaping.
 */
export const playNote = (
  midi: number,
  duration: number,
  startTime?: number,
  opts: SynthOpts = {}
): void => {
  // Try SoundFont sample first — instant upgrade when loaded.
  // Sample playback routes through our master bus (set up in soundfont.ts),
  // so master volume, EQ, and compressor all apply.
  const instrument = getInstrument(opts.instrument ?? 'electric_piano_1');
  if (instrument) {
    const ctx = getAudioContext();
    const t0 = startTime ?? ctx.currentTime;
    const noteName = midiToNoteName(midi);
    const playOpts: Record<string, number> = {
      duration: Math.max(duration, 0.05),
      gain: opts.gain ?? DEFAULTS.gain,
    };
    if (opts.release != null) playOpts.release = opts.release;
    if (opts.attack != null)  playOpts.attack  = opts.attack;
    if (opts.decay != null)   playOpts.decay   = opts.decay;
    if (opts.sustain != null) playOpts.sustain = opts.sustain;
    instrument.play(noteName, t0, playOpts);
    return;
  }

  // Fallback: oscillator synth (while samples are loading)
  const ctx = getAudioContext();
  const out = (opts.destination as AudioNode | undefined) ?? getMasterGain();
  const t0 = startTime ?? ctx.currentTime;
  const dur = Math.max(duration, 0.05);
  const { gain, waveform, brightness } = { ...DEFAULTS, ...opts };

  const freq = midiToFreq(midi);

  // Voice gain envelope: fast attack, exponential decay to silence. The
  // exponentialRamp to a tiny non-zero value avoids the "click" that a linear
  // ramp to exactly 0 would produce at the end.
  const voice = ctx.createGain();
  voice.gain.setValueAtTime(0, t0);
  voice.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  voice.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  voice.connect(out);

  // Mild low-pass to soften the top end — otherwise a sawtooth sounds harsh.
  // Filter cutoff scales with brightness and with the note's own pitch, so
  // bass notes stay warm and treble notes still shimmer.
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 800 + brightness * 3200 + freq * 2;
  lpf.Q.value = 0.7;
  lpf.connect(voice);

  // Fundamental oscillator — user-selected waveform at full amplitude.
  const osc = ctx.createOscillator();
  osc.type = waveform;
  osc.frequency.value = freq;
  osc.connect(lpf);

  // High shimmer — sine one octave up, scaled by brightness. Adds presence
  // without introducing dissonance.
  const shimmer = ctx.createOscillator();
  shimmer.type = 'sine';
  shimmer.frequency.value = freq * 2;
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = brightness * 0.25;
  shimmer.connect(shimmerGain);
  shimmerGain.connect(lpf);

  osc.start(t0);
  shimmer.start(t0);
  osc.stop(t0 + dur + 0.05);
  shimmer.stop(t0 + dur + 0.05);

  // Clean up graph refs once playback ends.
  osc.onended = () => {
    osc.disconnect();
    shimmer.disconnect();
    shimmerGain.disconnect();
    lpf.disconnect();
    voice.disconnect();
  };
};

/**
 * Schedule a chord — every MIDI note plays simultaneously.
 *
 * @param midis       Array of MIDI note numbers.
 * @param duration    Note length in seconds.
 * @param startTime   AudioContext time to start. Omit to play now.
 * @param opts        Optional tone shaping.
 */
export const playChord = (
  midis: number[],
  duration: number,
  startTime?: number,
  opts: SynthOpts = {}
): void => {
  // Per-note gain is reduced so 4-note chords don't exceed master headroom.
  // Square-root scaling keeps apparent loudness roughly constant vs single note.
  const perNoteGain = (opts.gain ?? DEFAULTS.gain) / Math.sqrt(Math.max(midis.length, 1));
  midis.forEach(midi => playNote(midi, duration, startTime, { ...opts, gain: perNoteGain }));
};
