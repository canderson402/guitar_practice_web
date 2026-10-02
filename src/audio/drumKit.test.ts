import { createDrumKit, DRUM_SAMPLES, KIT_LEVEL } from './drumKit';

const param = (value = 1) => {
  const p: any = { value, events: [] as Array<[string, ...number[]]> };
  p.setTargetAtTime = (v: number, t: number, tc: number) => p.events.push(['target', v, t, tc]);
  p.setValueAtTime = (v: number, t: number) => p.events.push(['set', v, t]);
  p.cancelScheduledValues = () => {};
  return p;
};
const fakeCtx = () => {
  const made = { sources: [] as any[], gains: [] as any[] };
  const ctx: any = {
    currentTime: 0, made,
    decodeAudioData: async (ab: ArrayBuffer) => ({ duration: 0.5, tag: new TextDecoder().decode(ab) }),
    createGain: () => { const g: any = { gain: param(), connect: (to: any) => to, disconnect() {} }; made.gains.push(g); return g; },
    createBufferSource: () => {
      const s: any = { playbackRate: param(1), connect: (to: any) => to, disconnect() {}, start(t: number) { s.at = t; }, stop(t?: number) { s.stoppedAt = t ?? 'now'; } };
      made.sources.push(s);
      return s;
    },
  };
  return ctx;
};
const fetched: string[] = [];
const fakeFetch = async (url: string) => {
  fetched.push(url);
  return { ok: true, arrayBuffer: async () => new TextEncoder().encode(url.split('/').pop()!).buffer } as Response;
};
const dest: any = { connect() {} };

beforeEach(() => { fetched.length = 0; });

it('loads every sample from the app\'s own drum folder', async () => {
  const kit = createDrumKit(fakeCtx(), dest, '/base', fakeFetch);
  await kit.load();
  expect(fetched.sort()).toEqual(Array.from(new Set(Object.values(DRUM_SAMPLES).flat(2))).map(f => `/base/samples/drums/${f}`).sort());
  expect(kit.ready()).toBe(true);
});

it('plays nothing until loaded, then the right sample at the right time', async () => {
  const ctx = fakeCtx();
  const kit = createDrumKit(ctx, dest, '', fakeFetch);
  expect(kit.play('snare', 1, 0.8)).toBe(false);
  await kit.load();
  expect(kit.play('snare', 1.25, 0.8)).toBe(true);
  const src = ctx.made.sources[0];
  expect(DRUM_SAMPLES.snare.flat()).toContain(src.buffer.tag);
  expect(src.at).toBe(1.25);
});

it('varies each hit a little (pitch and level), like a real drummer', async () => {
  const ctx = fakeCtx();
  const kit = createDrumKit(ctx, dest, '', fakeFetch);
  await kit.load();
  for (let i = 0; i < 8; i++) kit.play('kick', i, 1);
  const rates = ctx.made.sources.map((s: any) => s.playbackRate.value);
  expect(new Set(rates).size).toBeGreaterThan(1);
  rates.forEach((r: number) => expect(Math.abs(r - 1)).toBeLessThan(0.03));
});

it('a closed hat cuts off a ringing open hat', async () => {
  const ctx = fakeCtx();
  const kit = createDrumKit(ctx, dest, '', fakeFetch);
  await kit.load();
  kit.play('hatOpen', 1, 0.5);
  const openGain = ctx.made.gains.at(-1);
  kit.play('hatClosed', 1.5, 0.5);
  expect(openGain.gain.events.some((e: any[]) => e[0] === 'target' && e[1] === 0 && e[2] === 1.5)).toBe(true);
});

it('cancel stops hits scheduled for later, leaving ones already sounding', async () => {
  const ctx = fakeCtx();
  const kit = createDrumKit(ctx, dest, '', fakeFetch);
  await kit.load();
  kit.play('kick', 0, 1);
  kit.play('snare', 2, 1);
  ctx.currentTime = 1;
  kit.cancel();
  expect(ctx.made.sources[0].stoppedAt).toBeUndefined();
  expect(ctx.made.sources[1].stoppedAt).toBeDefined();
});

const tags = (ctx: any) => ctx.made.sources.map((s: any) => s.buffer.tag as string);

it('soft hits use the soft recordings, hard hits the hard ones', async () => {
  const ctx = fakeCtx();
  const kit = createDrumKit(ctx, dest, '', fakeFetch);
  await kit.load();
  kit.play('snare', 0, 0.05);
  kit.play('snare', 1, 1);
  const [soft, hard] = tags(ctx);
  expect(DRUM_SAMPLES.snare[0]).toContain(soft);
  expect(DRUM_SAMPLES.snare.at(-1)).toContain(hard);
});

it('repeated hits alternate between takes, so no two in a row are the same recording', async () => {
  const ctx = fakeCtx();
  const kit = createDrumKit(ctx, dest, '', fakeFetch);
  await kit.load();
  for (let i = 0; i < 6; i++) kit.play('hatClosed', i, 0.7);
  const t = tags(ctx);
  for (let i = 1; i < t.length; i++) expect(t[i]).not.toBe(t[i - 1]);
});

it('the kit is balanced: hi-hats and cymbals sit well under the kick and snare', () => {
  expect(KIT_LEVEL.hatClosed).toBeLessThan(KIT_LEVEL.kick * 0.5);
  expect(KIT_LEVEL.hatOpen).toBeLessThan(KIT_LEVEL.kick * 0.5);
  expect(KIT_LEVEL.ride).toBeLessThan(KIT_LEVEL.snare);
});
