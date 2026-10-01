import { act } from '@testing-library/react';
import type { TickEvent } from './transport';
import type { JamChord } from '../data/jamAlgorithms';

// Recorded calls live on a global: CRA resets jest.fn mocks between tests.
type Calls = { noteOn: Array<{ midis: number[]; time: number }>; noteOff: number; panic: number; setPatch: string[]; schedule: Array<(ev: TickEvent) => void> };
const calls = (): Calls => (globalThis as unknown as { mockJam: Calls }).mockJam;
const reset = () => { (globalThis as unknown as { mockJam: Calls }).mockJam = { noteOn: [], noteOff: 0, panic: 0, setPatch: [], schedule: calls()?.schedule ?? [] }; };
reset();

jest.mock('./engine', () => {
  const param = () => ({ value: 1, setTargetAtTime() {}, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} });
  return {
    getAudioContext: () => ({ currentTime: 0, createGain: () => ({ gain: param(), connect() {}, context: { currentTime: 0 } }) }),
    getMasterGain: () => ({}),
    getReverbSend: () => ({}),
  };
});
jest.mock('./effects', () => {
  const param = () => ({ value: 1, setTargetAtTime() {}, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} });
  return {
    createChorus: () => ({}),
    createPartChannel: () => ({ input: {}, duckGain: { gain: param() }, sendGain: { gain: param() } }),
  };
});
jest.mock('./padSynth', () => {
  const g = () => (globalThis as unknown as { mockJam: Calls }).mockJam;
  const patch = (id: string) => ({ id, name: id, defaults: { attack: 1, decay: 1, sustain: 0.8, release: 2, detune: 10, cutoff: 2000, reverbAmount: 0.5 } });
  return {
    DEFAULT_PATCH_ID: 'warm',
    PATCHES: [patch('warm'), patch('glass')],
    getPatch: patch,
    createPadSynth: () => ({
      noteOn: (midis: number[], time: number) => { g().noteOn.push({ midis, time }); },
      noteOff: () => { g().noteOff += 1; },
      panic: () => { g().panic += 1; },
      update: () => {},
      setPatch: (p: { id: string }) => { g().setPatch.push(p.id); },
    }),
  };
});
jest.mock('./transport', () => {
  const g = () => (globalThis as unknown as { mockJam: Calls }).mockJam;
  return {
    onSchedule: (fn: (ev: TickEvent) => void) => { g().schedule.push(fn); return () => {}; },
    atAudibleTime: (_t: number, fn: () => void) => fn(),
    restartTransport: () => {},
    isTransportRunning: () => false,
    useTransport: { getState: () => ({ barIndex: 0 }) },
  };
});

// eslint-disable-next-line import/first
import { initJam, startJam, stopJam, jamCountdownText, buildSimpleVoicing, setPadPatch, getPadSettings } from './jamEngine';
// eslint-disable-next-line import/first
import { useStore } from '../store/useStore';

const chord = (note: string, root: number): JamChord => ({ note, type: 'major', symbol: '', roman: 'I', midi: [root, root + 4, root + 7] });
const tick = (barIndex: number, beatInBar = 0): TickEvent =>
  ({ time: barIndex, subIndex: 0, subsPerBeat: 1, beatCount: barIndex * 4 + beatInBar, beatInBar, barIndex, beatsPerBar: 4, beatDuration: 0.5 });
const setJam = (patch: Partial<ReturnType<typeof useStore.getState>['jam']>) =>
  useStore.setState(s => ({ jam: { ...s.jam, ...patch } }));

beforeEach(() => { reset(); initJam(); });

describe('countdown text', () => {
  const pos = (barIndex: number, beatInBar: number) => ({ beatCount: barIndex * 4 + beatInBar, barIndex, beatInBar, beatsPerBar: 4 });
  const jam = { isPlaying: true, countIn: 1, barsPerChord: 4 };
  it('counts in, then shows the bar within the chord, then the beats to the change', () => {
    expect(jamCountdownText(jam, pos(0, 1))).toBe('Count-in 3');
    expect(jamCountdownText(jam, pos(1, 0))).toBe('Bar 1 of 4');
    expect(jamCountdownText(jam, pos(4, 2))).toBe('Next in 2 beats');
    expect(jamCountdownText(jam, pos(4, 3))).toBe('Next in 1 beat');
    expect(jamCountdownText({ ...jam, isPlaying: false }, pos(1, 0))).toBeNull();
    expect(jamCountdownText(jam, { ...pos(0, 0), beatCount: -1 })).toBeNull();
  });
});

it('voices a chord close, with the root an octave below', () => {
  expect(buildSimpleVoicing(chord('C', 60))).toEqual([48, 60, 64, 67]);
});

it('is one shared engine: initializing twice listens to the transport once', () => {
  initJam();
  initJam();
  expect(calls().schedule).toHaveLength(1);
});

it('plays the first chord after the count-in, and changes chord every N bars', () => {
  act(() => setJam({ isPlaying: true, countIn: 1, barsPerChord: 2, currentChordIndex: 0, chordQueue: [chord('C', 60), chord('F', 65)] }));
  const onTick = calls().schedule[0];
  onTick(tick(0));                 // count-in bar: silent
  expect(calls().noteOn).toHaveLength(0);
  onTick(tick(1));                 // first chord
  expect(calls().noteOn.map(n => n.midis[0])).toEqual([48, 60, 64, 67]);
  onTick(tick(2)); onTick(tick(1, 2)); // mid-chord: nothing new
  expect(calls().noteOn).toHaveLength(4);
  onTick(tick(3));                 // 2 bars later: F
  expect(calls().noteOn.slice(4).map(n => n.midis[0])).toEqual([53, 65, 69, 72]);
  expect(useStore.getState().jam.currentChordIndex).toBe(1);
});

it('stopping the metronome anywhere stops the jam and silences the pad', () => {
  act(() => { setJam({ isPlaying: true }); useStore.getState().setMetronomePlaying(true); });
  act(() => useStore.getState().setMetronomePlaying(false));
  expect(useStore.getState().jam.isPlaying).toBe(false);
  expect(calls().panic).toBeGreaterThan(0);
});

it('start marks the jam playing and starts the shared metronome; stop ends both', () => {
  act(() => startJam());
  expect(useStore.getState().jam.isPlaying).toBe(true);
  expect(useStore.getState().metronome.isPlaying).toBe(true);
  act(() => stopJam());
  expect(useStore.getState().jam.isPlaying).toBe(false);
  expect(useStore.getState().metronome.isPlaying).toBe(false);
});

it('rebuilds the chord queue when the shared key changes', () => {
  act(() => { useStore.getState().setJamMode('infinite'); useStore.getState().setSelectedScale('Major (Ionian)'); useStore.getState().setSelectedNote('C'); });
  const before = useStore.getState().jam.chordQueue[0]?.note;
  act(() => useStore.getState().setSelectedNote('E'));
  expect(useStore.getState().jam.chordQueue[0]?.note).not.toBe(before);
  expect(useStore.getState().jam.chordQueue[0]?.note).toBe('E');
});

it('switching sound loads that patch and resets the pad settings to its defaults', () => {
  const next = setPadPatch('glass');
  expect(calls().setPatch).toEqual(['glass']);
  expect(next).toMatchObject({ attack: 1, stagger: 0 });
  expect(getPadSettings()).toEqual(next);
});

it('in 5/4 a chord lasts the whole 5-beat bar (chords change on bar lines, following the time signature)', () => {
  act(() => setJam({ isPlaying: true, countIn: 1, barsPerChord: 1, currentChordIndex: 0, chordQueue: [chord('C', 60), chord('F', 65)] }));
  const onTick = calls().schedule[0];
  const t5 = (beatCount: number): TickEvent => ({ time: beatCount, subIndex: 0, subsPerBeat: 1, beatCount, beatInBar: beatCount % 5, barIndex: Math.floor(beatCount / 5), beatsPerBar: 5, beatDuration: 0.5 });
  for (let b = 5; b < 10; b++) onTick(t5(b));   // the whole first bar after the count-in
  expect(calls().noteOn.map(n => n.midis[0])).toEqual([48, 60, 64, 67]);  // just C
  onTick(t5(10));                                 // next bar line: F
  expect(calls().noteOn.slice(4).map(n => n.midis[0])).toEqual([53, 65, 69, 72]);
});
