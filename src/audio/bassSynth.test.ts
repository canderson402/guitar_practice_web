import { createBassSynth } from './bassSynth';

const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} });
const fakeCtx = () => {
  const oscs: any[] = [];
  const node = (extra: object = {}) => ({ connect: (to: any) => to, disconnect() {}, ...extra });
  const ctx: any = {
    currentTime: 0, oscs,
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ type: '', frequency: param(), Q: param() }),
    createOscillator: () => {
      const o: any = node({ type: '', frequency: param(), start(t: number) { o.startAt = t; }, stop(t?: number) { o.stopAt = t ?? 'now'; } });
      oscs.push(o);
      return o;
    },
  };
  return ctx;
};

it('plays a note at its pitch, starting on time and stopping after its length', () => {
  const ctx = fakeCtx();
  const bass = createBassSynth(ctx, ctx.createGain());
  bass.play(33, 2, 0.5, 0.9);   // A1
  expect(ctx.oscs.length).toBeGreaterThan(0);
  ctx.oscs.forEach((o: any) => {
    expect(o.frequency.value).toBeCloseTo(55, 3);
    expect(o.startAt).toBe(2);
    expect(o.stopAt).toBeGreaterThan(2.5);
    expect(o.stopAt).toBeLessThan(3);
  });
});

it('panic stops notes scheduled for later', () => {
  const ctx = fakeCtx();
  const bass = createBassSynth(ctx, ctx.createGain());
  bass.play(40, 5, 1, 1);
  ctx.currentTime = 1;
  bass.panic();
  ctx.oscs.forEach((o: any) => expect(o.stopAt).toBe('now'));
});

it('tunes to the reference pitch', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setReferencePitch } = require('./pitch');
  setReferencePitch(432);
  try {
    const ctx = fakeCtx();
    createBassSynth(ctx, ctx.createGain()).play(33, 0, 1, 1);
    ctx.oscs.forEach((o: any) => expect(o.frequency.value).toBeCloseTo(54, 3));
  } finally {
    setReferencePitch(440);
  }
});
