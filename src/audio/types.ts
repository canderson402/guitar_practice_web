// ---------------------------------------------------------------------------
// Shared audio types.
// ---------------------------------------------------------------------------

/** Options passed to a synthesised note. All fields optional — sensible
 *  defaults make `playNote(midi, duration)` do the right thing. */
export interface SynthOpts {
  /** 0–1 output volume for this note. Default 0.25 (leaves headroom). */
  gain?: number;
  /** Fundamental waveform. Default 'sawtooth' — warm, grounded. */
  waveform?: OscillatorType;
  /** 0–1 brightness: how much high-harmonic content is mixed in.
   *  Default 0.5. Higher = twangier/brighter. */
  brightness?: number;
  /** SoundFont instrument name. Default 'electric_piano_1' (Rhodes).
   *  Falls back to oscillator synth while the instrument is loading. */
  instrument?: string;
  /** Release tail in seconds — time the note continues decaying *after*
   *  `duration` elapses. Only honored on the soundfont path. Default is
   *  soundfont-player's own (~0.3s). Set higher for pads/keys that should
   *  bloom and ring. */
  release?: number;
  /** Attack ramp in seconds — time to fade from silence to full gain at
   *  note start. Only honored on the soundfont path. Default is
   *  soundfont-player's own (~0.01s = instant). Set higher for pads that
   *  should bloom in gently. */
  attack?: number;
  /** Decay in seconds — after attack hits peak, the envelope falls from
   *  peak to `sustain` level over this many seconds. Only honored on the
   *  soundfont path. Longer decay = slower slump from bloom to held level. */
  decay?: number;
  /** Sustain level (0–1) — the fraction of peak gain the note holds at
   *  after decay finishes, until note-off triggers release. 1.0 = hold full
   *  bloom. 0.7 = drops to 70% after decay. Only honored on the soundfont
   *  path. */
  sustain?: number;
  /** Destination node for the oscillator-synth fallback path. Soundfont
   *  path uses the player's pre-set destination and ignores this. Default:
   *  master gain. */
  destination?: AudioNode;
}

/** A running scheduler. Call start to begin, stop to cancel, setBpm to retune
 *  mid-playback (existing scheduled events keep their times; new ones follow
 *  the new tempo). */
export interface Scheduler {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
  setBpm: (bpm: number) => void;
}

/** Callback fired on each scheduled beat. `beatIndex` counts from 0 at the
 *  last start(). `audioTime` is the AudioContext time when the beat hits —
 *  use it to schedule sample-accurate events (e.g. `osc.start(audioTime)`). */
export type BeatCallback = (beatIndex: number, audioTime: number) => void;
