// The piano and guitar are samples recorded at A4 = 440; they're retuned to
// the reference pitch by detuning each note. While they're still loading, a
// note plays a simple synth tone right away — never queued to play late.
const starts: any[] = [];
const created: any[] = [];
const loads: Array<() => void> = [];
const fallback: any[] = [];
jest.mock('smplr', () => {
  class Inst {
    load: Promise<unknown>;
    constructor(_ctx: unknown, opts: unknown) { created.push(opts); this.load = new Promise(r => loads.push(() => r(this))); }
    start(ev: any) { starts.push(ev); }
  }
  return { SplendidGrandPiano: Inst, Soundfont: Inst };
});
const gains: any[] = [];
jest.mock('./engine', () => ({
  getAudioContext: () => ({ createGain: () => { const g = { gain: { value: 1 }, connect: () => {} }; gains.push(g); return g; } }),
  getMasterGain: () => ({}),
}));
jest.mock('./fallbackTone', () => ({ playFallbackTone: (...args: unknown[]) => { fallback.push(args); } }));
// eslint-disable-next-line import/first
import { playPianoNote, preloadPiano } from './piano';
// eslint-disable-next-line import/first
import { playGuitarNote, preloadGuitar } from './guitar';
// eslint-disable-next-line import/first
import { setReferencePitch } from './pitch';
// eslint-disable-next-line import/first
import { setInstrumentVolume, volumeToGain } from './instrumentVolume';

const flush = () => new Promise(r => setTimeout(r, 0));
afterEach(() => { setReferencePitch(440); starts.length = 0; fallback.length = 0; });

it('the piano loads a single velocity layer (a fraction of the download)', () => {
  void preloadPiano();
  expect(created[0].notesToLoad.velocityRange).toEqual([85, 100]);
});

it('while still loading, a note plays a synth tone now — and is not played again when loading finishes', async () => {
  void playGuitarNote(52, 1);
  expect(fallback).toEqual([[52, 1, undefined]]);
  loads.forEach(l => l());
  await flush();
  expect(starts).toHaveLength(0);
});

it('once loaded, notes play the samples immediately', async () => {
  loads.forEach(l => l());
  await preloadPiano();
  await preloadGuitar();
  await playPianoNote(60, 1);
  await playGuitarNote(52, 1, 2);
  expect(starts.map(s => s.note)).toEqual([60, 52]);
  expect(fallback).toHaveLength(0);
});

it('at another reference pitch, piano and guitar notes are detuned to match', async () => {
  setReferencePitch(432);
  await playPianoNote(60, 1);
  await playGuitarNote(52, 1, 2);
  starts.forEach(ev => expect(ev.detune).toBeCloseTo(-31.77, 1));
  expect(starts[1]).toMatchObject({ note: 52, time: 2 });
});

it('volume: 50% is the samples\' own level, 100% four times as loud (+12 dB), 0 silent', () => {
  expect(volumeToGain(50)).toBeCloseTo(1);
  expect(volumeToGain(100)).toBeCloseTo(4);
  expect(volumeToGain(0)).toBe(0);
  expect(volumeToGain(150)).toBeCloseTo(4);   // clamped
});

it('each instrument plays through its own volume: guitar louder by default (80%), piano as recorded (50%)', async () => {
  await preloadGuitar();
  await preloadPiano();
  const dest = (kind: 'guitar' | 'piano') => created.find(o => (kind === 'guitar' ? o.instrument : o.notesToLoad))!.destination;
  expect(dest('guitar').gain.value).toBeCloseTo(volumeToGain(80));
  expect(dest('piano').gain.value).toBeCloseTo(1);
  setInstrumentVolume('guitar', 100);
  setInstrumentVolume('piano', 25);
  expect(dest('guitar').gain.value).toBeCloseTo(4);
  expect(dest('piano').gain.value).toBeCloseTo(0.25);
});
