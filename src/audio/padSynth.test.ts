import { createPadSynth, getPatch, PATCHES, DEFAULT_PATCH_ID } from './padSynth';

// A minimal fake AudioContext that records what the synth builds.
const param = (value = 0) => ({
  value, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {},
});
const fakeCtx = () => {
  const made = { buffers: [] as any[], sources: [] as any[], oscs: [] as any[], panners: [] as any[], filters: [] as any[], waves: [] as any[] };
  const node = (extra: object = {}) => ({ connect: () => {}, disconnect: () => {}, ...extra });
  const ctx: any = {
    sampleRate: 48000, currentTime: 0, made,
    createGain: () => node({ gain: param(1) }),
    createBiquadFilter: () => { const f = node({ type: '', Q: param(), frequency: param(), detune: param() }); made.filters.push(f); return f; },
    createStereoPanner: () => { const p = node({ pan: param() }); made.panners.push(p); return p; },
    createOscillator: () => {
      const o: any = node({ type: 'sine', frequency: param(440), detune: param(), start() {}, stop() {}, setPeriodicWave(w: unknown) { o.wave = w; } });
      made.oscs.push(o);
      return o;
    },
    createPeriodicWave: (real: Float32Array, imag: Float32Array) => { const w = { real, imag }; made.waves.push(w); return w; },
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      const b = { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (c: number) => data[c] };
      made.buffers.push(b);
      return b;
    },
    createBufferSource: () => {
      const s: any = node({ buffer: null, loop: false, playbackRate: param(1), detune: param(), stop() {}, start(...args: number[]) { s.startArgs = args; } });
      made.sources.push(s);
      return s;
    },
  };
  return ctx;
};
const opts = { attack: 0.5, decay: 1, sustain: 0.8, release: 1, detune: 10, cutoff: 2000, gain: 0.2 };

it('offers the new lush sounds first, keeping the old ones', () => {
  const ids = PATCHES.map(p => p.id);
  expect(ids.slice(0, 5)).toEqual(['lush', 'choir', 'ensemble', 'glasspad', 'supersaw']);
  expect(ids).toEqual(expect.arrayContaining(['warm', 'strings', 'keys', 'glass', 'classic']));
  expect(DEFAULT_PATCH_ID).toBe('lush');
});

describe('wavetable (PADsynth) pads', () => {
  it('play a stereo looping table per note, from a random point in the loop', () => {
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('lush'));
    synth.noteOn([60], 1, opts);
    const srcs = ctx.made.sources;
    expect(srcs.length).toBeGreaterThan(0);
    srcs.forEach((s: any) => {
      expect(s.loop).toBe(true);
      expect(s.buffer.numberOfChannels).toBe(2);
      expect(s.startArgs[0]).toBe(1);
      expect(s.startArgs[1]).toBeGreaterThanOrEqual(0);
      expect(s.startArgs[1]).toBeLessThan(s.buffer.duration);
    });
    // Layers start at different points so they never line up.
    expect(srcs.length).toBe(2);
    expect(srcs[0].startArgs[1]).not.toBe(srcs[1].startArgs[1]);
  });

  it('pitch each note from the table of its octave, never up an octave or more', () => {
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('lush'));
    [48, 55, 59, 60, 71].forEach(m => synth.noteOn([m], 0, opts));
    ctx.made.sources.forEach((s: any) => {
      expect(s.playbackRate.value).toBeGreaterThanOrEqual(0.999);
      expect(s.playbackRate.value).toBeLessThan(2);
    });
  });

  it('build each table once and reuse it', () => {
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('choir'));
    synth.noteOn([60, 64], 0, opts);
    const built = ctx.made.buffers.length;
    synth.noteOn([62, 67], 1, opts);
    expect(ctx.made.buffers.length).toBe(built);
  });
});

describe('supersaw', () => {
  it('stacks seven saws per note, each starting at its own phase, spread across the stereo field', () => {
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('supersaw'));
    synth.noteOn([60], 0, opts);
    const saws = ctx.made.oscs.filter((o: any) => o.wave);
    expect(saws).toHaveLength(7);
    expect(new Set(saws.map((o: any) => o.wave)).size).toBeGreaterThan(1);
    expect(new Set(saws.map((o: any) => o.detune.value)).size).toBe(7);
    const pans = ctx.made.panners.map((p: any) => p.pan.value);
    expect(Math.min(...pans)).toBeLessThan(-0.5);
    expect(Math.max(...pans)).toBeGreaterThan(0.5);
  });
});

it('gives each held note its own slow pitch drift on the new sounds', () => {
  const ctx = fakeCtx();
  const synth = createPadSynth(ctx, ctx.createGain(), getPatch('lush'));
  const before = ctx.made.oscs.length;
  synth.noteOn([60, 64], 0, opts);
  const lfos = ctx.made.oscs.slice(before).filter((o: any) => o.frequency.value < 1);
  expect(lfos).toHaveLength(2);
  expect(lfos[0].frequency.value).not.toBe(lfos[1].frequency.value);
});

it('prebuilds a wavetable sound in the background, so the first chord does not stall', () => {
  jest.useFakeTimers();
  try {
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('supersaw'));
    jest.runAllTimers();
    expect(ctx.made.buffers).toHaveLength(0);   // nothing to build for a supersaw
    synth.setPatch(getPatch('glasspad'));
    jest.runAllTimers();
    expect(ctx.made.buffers.length).toBeGreaterThanOrEqual(3);
  } finally {
    jest.useRealTimers();
  }
});

describe('never stalls playback building wavetables', () => {
  it('prepare() builds the sound\'s tables up front (before the transport starts)', () => {
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('lush'));
    synth.prepare();
    const built = ctx.made.buffers.length;
    expect(built).toBeGreaterThanOrEqual(4);
    synth.noteOn([48, 60, 64, 67], 0, opts);
    expect(ctx.made.buffers.length).toBe(built);
  });

  it('switching to a wavetable sound keeps playing the old sound until the new one is ready, then says so', () => {
    jest.useFakeTimers();
    try {
      const ctx = fakeCtx();
      const synth = createPadSynth(ctx, ctx.createGain(), getPatch('supersaw'));
      let ready = 0;
      synth.setPatch(getPatch('choir'), () => { ready += 1; });
      synth.noteOn([60], 0, opts);                     // mid-switch: still the supersaw, nothing built now
      expect(ctx.made.sources).toHaveLength(0);
      expect(ready).toBe(0);
      jest.runAllTimers();
      expect(ready).toBe(1);
      const built = ctx.made.buffers.length;
      synth.noteOn([60], 1, opts);
      expect(ctx.made.sources.length).toBeGreaterThan(0);
      expect(ctx.made.buffers.length).toBe(built);
    } finally {
      jest.useRealTimers();
    }
  });

  it('a note outside the prepared octaves borrows the nearest table instead of building one mid-play', () => {
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('lush'));
    synth.prepare();
    const built = ctx.made.buffers.length;
    synth.noteOn([28], 0, opts);
    expect(ctx.made.buffers.length).toBe(built);
  });
});

describe('reference pitch', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setReferencePitch } = require('./pitch');
  afterEach(() => setReferencePitch(440));

  it('synth voices tune to it', () => {
    setReferencePitch(432);
    const ctx = fakeCtx();
    const synth = createPadSynth(ctx, ctx.createGain(), getPatch('supersaw'));
    synth.noteOn([69], 0, opts);
    ctx.made.oscs.filter((o: any) => o.wave).forEach((o: any) => expect(o.frequency.value).toBeCloseTo(432, 6));
  });

  it('wavetable voices are retuned by playback rate', () => {
    const at440 = fakeCtx();
    createPadSynth(at440, at440.createGain(), getPatch('lush')).noteOn([69], 0, opts);
    setReferencePitch(432);
    const at432 = fakeCtx();
    createPadSynth(at432, at432.createGain(), getPatch('lush')).noteOn([69], 0, opts);
    expect(at432.made.sources[0].playbackRate.value / at440.made.sources[0].playbackRate.value).toBeCloseTo(432 / 440, 6);
  });
});
