import { createPlateReverb } from './effects';

jest.mock('smplr', () => ({
  // Registering smplr's reverb registers its plate worklet on the context.
  Reverb: class { constructor(ctx: any) { ctx.registered = true; } ready() { return Promise.resolve(this); } },
}));

type Link = [string, string];
const fake = (withWorklet: boolean) => {
  const links: Link[] = [];
  const node = (name: string): any => ({
    name, gain: { value: 1 },
    connect(to: any) { links.push([name, to.name]); return to; },
    disconnect(to: any) { const i = links.findIndex(l => l[0] === name && l[1] === to.name); if (i >= 0) links.splice(i, 1); },
  });
  let made = 0;
  const ctx: any = { sampleRate: 48000, createGain: () => node(`gain${made++}`) };
  if (withWorklet) ctx.audioWorklet = {};
  return { ctx, links, node };
};

const workletNodes: any[] = [];
beforeEach(() => {
  workletNodes.length = 0;
  (globalThis as any).AudioWorkletNode = function (this: any, ctx: any, name: string, opts: any) {
    if (!ctx.registered) throw new Error('not registered');
    Object.assign(this, { name: 'plate', processor: name, opts, connect(to: any) { (ctx.links as Link[]).push(['plate', to.name]); return to; } });
    workletNodes.push(this);
  };
});

it('sends to the plate reverb once it loads, then into the mix', async () => {
  const { ctx, links, node } = fake(true);
  ctx.links = links;
  const plate: any = createPlateReverb(ctx, node('master'), node('room'));
  expect(links).toContainEqual([plate.input.name, 'room']);   // until it loads
  await expect(plate.ready).resolves.toBe(true);
  expect(workletNodes[0].processor).toBe('DattorroReverb');
  // A long, darker tail than the default plate.
  expect(workletNodes[0].opts.parameterData.decay).toBeGreaterThan(0.7);
  expect(workletNodes[0].opts.parameterData.damping).toBeGreaterThan(0.1);
  expect(links).toContainEqual([plate.input.name, 'plate']);
  expect(links).not.toContainEqual([plate.input.name, 'room']);
  expect(links.some(([from]) => from === 'plate')).toBe(true);
});

it('keeps using the shared room reverb where worklets are not supported', async () => {
  const { ctx, links, node } = fake(false);
  const plate: any = createPlateReverb(ctx, node('master'), node('room'));
  await expect(plate.ready).resolves.toBe(false);
  expect(links).toContainEqual([plate.input.name, 'room']);
});

it('can be silenced (tail cut on Stop) and restored', async () => {
  const { ctx, links, node } = fake(true);
  ctx.links = links;
  ctx.currentTime = 2;
  const events: any[] = [];
  ctx.createGain = () => {
    const g: any = node('g' + events.length);
    g.gain = { value: 1, setTargetAtTime: (v: number, t: number) => events.push(['target', v, t]), cancelScheduledValues() {}, setValueAtTime: (v: number, t: number) => events.push(['set', v, t]) };
    return g;
  };
  const plate: any = createPlateReverb(ctx, node('master'), node('room'));
  await plate.ready;
  plate.silence();
  expect(events.some(e => e[0] === 'target' && e[1] === 0 && e[2] === 2)).toBe(true);
  plate.restore();
  expect(events.at(-1)[1]).toBeGreaterThan(0);
});
