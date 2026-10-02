import { buildPadTable, fft, sawPhaseCoefficients, tableBaseFor, SUPERSAW_OFFSETS } from './padTable';

const N = 1 << 14;
const SR = 48000;
// A fundamental that sits exactly on an FFT bin, so harmonics are easy to find.
const F = (SR / N) * 40;

const magnitudes = (x: Float32Array): number[] => {
  const re = Float64Array.from(x);
  const im = new Float64Array(x.length);
  fft(re, im, false);
  return Array.from({ length: x.length / 2 }, (_, i) => Math.hypot(re[i], im[i]));
};

describe('PADsynth wavetable', () => {
  const spec = { amp: (n: number) => 1 / n, harmonics: 8, bandwidth: 30, bwScale: 1 };

  it('fills the table and normalizes it to a peak of 1', () => {
    const t = buildPadTable(spec, { size: N, sampleRate: SR, baseFreq: F, seed: 1 });
    expect(t).toHaveLength(N);
    const peak = t.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeCloseTo(1, 5);
  });

  it('puts its energy at the harmonics, smeared by the bandwidth', () => {
    const mags = magnitudes(buildPadTable(spec, { size: N, sampleRate: SR, baseFreq: F, seed: 1 }));
    const bin = (hz: number) => Math.round((hz * N) / SR);
    const near = (hz: number) => Math.max(...mags.slice(bin(hz) - 3, bin(hz) + 4));
    // Each harmonic is loud; halfway between harmonics is near-silent.
    for (let n = 1; n <= 4; n++) expect(near(F * n)).toBeGreaterThan(20 * near(F * (n + 0.5)));
    // Louder harmonics stay louder (1/n).
    expect(near(F)).toBeGreaterThan(near(F * 4));
    // Nothing above the last harmonic.
    expect(near(F * 12)).toBeLessThan(near(F) / 100);
  });

  it('is repeatable by seed, and different seeds are decorrelated (for stereo)', () => {
    // Real tables are big enough that each harmonic spans many FFT bins;
    // a wide bandwidth gives this small table the same.
    const wide = { ...spec, bandwidth: 400 };
    const opts = { size: N, sampleRate: SR, baseFreq: F };
    const a = buildPadTable(wide, { ...opts, seed: 1 });
    expect(buildPadTable(wide, { ...opts, seed: 1 })).toEqual(a);
    const b = buildPadTable(wide, { ...opts, seed: 2 });
    let ab = 0, aa = 0, bb = 0;
    for (let i = 0; i < N; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
    expect(Math.abs(ab / Math.sqrt(aa * bb))).toBeLessThan(0.2);
  });

  it('can shape harmonics by their absolute frequency (formants)', () => {
    const formant = { amp: (_n: number, hz: number) => (hz > F * 2.5 && hz < F * 3.5 ? 1 : 0.01), harmonics: 6, bandwidth: 20, bwScale: 1 };
    const mags = magnitudes(buildPadTable(formant, { size: N, sampleRate: SR, baseFreq: F, seed: 3 }));
    const at = (n: number) => Math.max(...mags.slice(Math.round((F * n * N) / SR) - 3, Math.round((F * n * N) / SR) + 4));
    expect(at(3)).toBeGreaterThan(at(1) * 10);
  });
});

describe('table octaves', () => {
  it('plays each note from the table at or below it, never pitched up an octave or more', () => {
    for (let midi = 24; midi <= 96; midi++) {
      const base = tableBaseFor(midi);
      expect(midi - base).toBeGreaterThanOrEqual(0);
      expect(midi - base).toBeLessThan(12);
    }
  });
});

describe('supersaw', () => {
  it('has seven voices spread around the center', () => {
    expect(SUPERSAW_OFFSETS).toHaveLength(7);
    expect(Math.min(...SUPERSAW_OFFSETS)).toBeLessThan(-0.9);
    expect(Math.max(...SUPERSAW_OFFSETS)).toBeGreaterThan(0.9);
  });

  it('builds saw coefficients that start anywhere in the cycle', () => {
    const zero = sawPhaseCoefficients(0, 16);
    expect(Array.from(zero.real).every(v => Math.abs(v) < 1e-12)).toBe(true);
    expect(zero.imag[1]).toBeCloseTo(2 / Math.PI, 6);
    const quarter = sawPhaseCoefficients(Math.PI / 2, 16);
    // Shifting the phase moves energy between sine and cosine terms, but each
    // harmonic keeps its strength.
    for (let n = 1; n < 16; n++) expect(Math.hypot(quarter.real[n], quarter.imag[n])).toBeCloseTo(Math.hypot(zero.real[n], zero.imag[n]), 9);
    expect(Math.abs(quarter.real[1])).toBeGreaterThan(0.5);
  });
});
