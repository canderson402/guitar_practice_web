// ---------------------------------------------------------------------------
// Wavetables for lush pads.
//
// PADsynth (Paul Nasca, ZynAddSubFX): describe a sound as harmonics, give
// each harmonic a bandwidth (spread it over a Gaussian band of frequencies
// instead of one exact frequency), randomize every phase and inverse-FFT.
// The result is a perfectly looping sample that sounds like an ensemble —
// many slightly-out-of-tune players — with no oscillator beating patterns.
// It's computed once per patch and octave; playing it is just a looped
// AudioBufferSourceNode.
//
// Also here: phase-shifted sawtooth coefficients for the supersaw (Web Audio
// oscillators always start at phase 0, so stacked saws started together
// line up and sound sterile; each supersaw voice gets a random phase).
// ---------------------------------------------------------------------------

export interface PadTableSpec {
  /** Amplitude of harmonic `n` (1 = fundamental) at absolute frequency `hz`
   *  — use `hz` for formants that stay put as the pitch moves. */
  amp: (n: number, hz: number) => number;
  /** How many harmonics to include (fewer are used if they'd alias). */
  harmonics: number;
  /** Bandwidth of the fundamental in cents. ~10 = subtle, 40+ = choir. */
  bandwidth: number;
  /** How bandwidth grows with harmonic number: 1 = in proportion (natural
   *  ensemble), > 1 = upper harmonics shimmer more. */
  bwScale: number;
}

export interface PadTableOpts {
  /** Samples; must be a power of two. */
  size: number;
  sampleRate: number;
  /** Fundamental of the table in Hz (played back at other pitches). */
  baseFreq: number;
  /** Seed for the random phases — different seeds give decorrelated
   *  tables, so two make a wide stereo pair. */
  seed: number;
}

/** In-place iterative radix-2 FFT (inverse when `inverse`, unscaled). */
export const fft = (re: Float64Array, im: Float64Array, inverse: boolean): void => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
};

// Small seeded PRNG (mulberry32) so tables are repeatable.
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A looping PADsynth table, normalized to a peak of 1. */
export const buildPadTable = (spec: PadTableSpec, opts: PadTableOpts): Float32Array => {
  const { size: N, sampleRate: sr, baseFreq: f, seed } = opts;
  const half = N / 2;
  const amp = new Float64Array(half);
  const nyquist = sr / 2;
  for (let n = 1; n <= spec.harmonics; n++) {
    const hz = f * n;
    // Leave headroom: tables are played up to an octave higher.
    if (hz * 2 >= nyquist * 0.95) break;
    const a = spec.amp(n, hz);
    if (a <= 0) continue;
    const bwHz = (Math.pow(2, spec.bandwidth / 1200) - 1) * f * Math.pow(n, spec.bwScale);
    const bwi = bwHz / (2 * sr);       // as a fraction of the sample rate
    const fi = hz / sr;
    // Gaussian profile, evaluated only where it's not negligible.
    const lo = Math.max(1, Math.floor((fi - 3 * bwi) * N));
    const hi = Math.min(half - 1, Math.ceil((fi + 3 * bwi) * N));
    for (let i = lo; i <= hi; i++) {
      const x = (i / N - fi) / bwi;
      amp[i] += (Math.exp(-x * x) / bwi) * a;
    }
  }
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const rand = rng(seed);
  for (let i = 1; i < half; i++) {
    const phase = rand() * 2 * Math.PI;
    re[i] = amp[i] * Math.cos(phase);
    im[i] = amp[i] * Math.sin(phase);
    // Conjugate mirror → real output.
    re[N - i] = re[i];
    im[N - i] = -im[i];
  }
  fft(re, im, true);
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(re[i]));
  const out = new Float32Array(N);
  if (peak > 0) for (let i = 0; i < N; i++) out[i] = re[i] / peak;
  return out;
};

/** Tables are built one per octave, on C. A note plays from the table at or
 *  below it, so it's never pitched up by an octave or more (no aliasing, and
 *  the timbre stays consistent across the range). */
export const tableBaseFor = (midi: number): number => Math.floor(midi / 12) * 12;

/** Supersaw voice detune positions (×detune), roughly the JP-8000 spread. */
export const SUPERSAW_OFFSETS = [-1, -0.62, -0.31, 0, 0.29, 0.6, 0.97];

/** Fourier coefficients of a sawtooth starting at `phase` radians, for
 *  `createPeriodicWave(real, imag)`. */
export const sawPhaseCoefficients = (phase: number, harmonics: number): { real: Float32Array; imag: Float32Array } => {
  const real = new Float32Array(harmonics);
  const imag = new Float32Array(harmonics);
  for (let n = 1; n < harmonics; n++) {
    const b = ((2 / (Math.PI * n)) * (n % 2 ? 1 : -1));
    // sin(n(ωt + φ)) = sin(nωt)·cos(nφ) + cos(nωt)·sin(nφ)
    real[n] = b * Math.sin(n * phase);
    imag[n] = b * Math.cos(n * phase);
  }
  return { real, imag };
};
