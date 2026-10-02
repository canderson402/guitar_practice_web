import { act } from '@testing-library/react';
import type { TickEvent } from './transport';
import type { JamChord } from '../data/jamAlgorithms';

// Recorded calls live on a global: CRA resets jest.fn mocks between tests.
type Calls = { noteOn: Array<{ midis: number[]; time: number }>; noteOff: number; panic: number; setPatch: string[]; schedule: Array<(ev: TickEvent) => void>; drums: Array<{ voice: string; time: number }>; drumLoads: number; drumCancels: number; reverb: string[]; bass: Array<{ midi: number; time: number; dur: number }>; bassPanic: number };
const calls = (): Calls => (globalThis as unknown as { mockJam: Calls }).mockJam;
const reset = () => { (globalThis as unknown as { mockJam: Calls }).mockJam = { noteOn: [], noteOff: 0, panic: 0, setPatch: [], schedule: calls()?.schedule ?? [], drums: [], drumLoads: 0, drumCancels: 0, reverb: [], bass: [], bassPanic: 0 }; };
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
    createPlateReverb: () => ({
      input: {}, ready: Promise.resolve(false),
      silence: () => { (globalThis as unknown as { mockJam: Calls }).mockJam.reverb.push('silence'); },
      restore: () => { (globalThis as unknown as { mockJam: Calls }).mockJam.reverb.push('restore'); },
    }),
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
      setPatch: (p: { id: string }, onReady?: () => void) => { g().setPatch.push(p.id); onReady?.(); },
      prepare: () => {},
    }),
  };
});
jest.mock('./drumKit', () => {
  const g = () => (globalThis as unknown as { mockJam: Calls }).mockJam;
  return {
    createDrumKit: () => ({
      load: () => { g().drumLoads += 1; return Promise.resolve(); },
      ready: () => true,
      play: (voice: string, time: number) => { g().drums.push({ voice, time }); return true; },
      cancel: () => { g().drumCancels += 1; },
    }),
  };
});
jest.mock('./bassSynth', () => {
  const g = () => (globalThis as unknown as { mockJam: Calls }).mockJam;
  return {
    createBassSynth: () => ({
      play: (midi: number, time: number, dur: number) => { g().bass.push({ midi, time, dur }); },
      panic: () => { g().bassPanic += 1; },
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
import { initJam, startJam, stopJam, jamCountdownText, setPadPatch, getPadSettings, setDrumGroove, setChordColor, setBassPattern, trackGains, DEFAULT_MIX } from './jamEngine';
// eslint-disable-next-line import/first
import { useStore } from '../store/useStore';

const chord = (note: string, root: number): JamChord => ({ note, type: 'major', symbol: '', roman: 'I', midi: [root, root + 4, root + 7] });
const tick = (barIndex: number, beatInBar = 0): TickEvent =>
  ({ time: barIndex, subIndex: 0, subsPerBeat: 1, beatCount: barIndex * 4 + beatInBar, beatInBar, barIndex, beatsPerBar: 4, beatDuration: 0.5 });
const setJam = (patch: Partial<ReturnType<typeof useStore.getState>['jam']>) =>
  useStore.setState(s => ({ jam: { ...s.jam, ...patch } }));

beforeEach(() => {
  reset();
  initJam();
  setChordColor('triads');
  act(() => { useStore.getState().setSelectedNote('C'); useStore.getState().setSelectedScale('Major (Ionian)'); });
});

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

const pcs = (midis: number[]) => Array.from(new Set(midis.map(m => m % 12))).sort((a, b) => a - b);
const chordAt = (from: number, to?: number) => calls().noteOn.slice(from, to).map(n => n.midis[0]);

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
  const first = calls().noteOn.length;
  expect(pcs(chordAt(0))).toEqual([0, 4, 7]);
  onTick(tick(2)); onTick(tick(1, 2)); // mid-chord: nothing new
  expect(calls().noteOn).toHaveLength(first);
  onTick(tick(3));                 // 2 bars later: F
  expect(pcs(chordAt(first))).toEqual([0, 5, 9]);
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
  const first = calls().noteOn.length;
  expect(pcs(chordAt(0))).toEqual([0, 4, 7]);    // just C
  onTick(t5(10));                                 // next bar line: F
  expect(pcs(chordAt(first))).toEqual([0, 5, 9]);
});

describe('drums', () => {
  it('the kit starts loading as soon as the jam is set up, even with drums off', () => {
    jest.isolateModules(() => {
      reset();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fresh = require('./jamEngine');
      fresh.setDrumGroove('off');
      fresh.initJam();
    });
    expect(calls().drumLoads).toBeGreaterThan(0);
  });

  const play = () => act(() => setJam({ isPlaying: true, countIn: 1, barsPerChord: 2, currentChordIndex: 0, chordQueue: [chord('C', 60)] }));

  it('play the groove on every beat after the count-in, placed within the beat', () => {
    setDrumGroove('rock');
    play();
    const onTick = calls().schedule[0];
    for (let b = 0; b < 4; b++) onTick(tick(0, b));    // count-in: click only
    expect(calls().drums).toHaveLength(0);
    onTick(tick(1, 0));
    const voices = calls().drums.map(d => d.voice);
    expect(voices).toEqual(expect.arrayContaining(['kick', 'hatClosed']));
    // The "and" lands half a beat later (beatDuration 0.5 s), give or take a hair of feel.
    const and = calls().drums.find(d => d.time > 1.1)!;
    expect(and.time).toBeGreaterThan(1.2);
    expect(and.time).toBeLessThan(1.3);
    // The downbeat is exactly on time.
    expect(calls().drums.find(d => d.voice === 'kick')!.time).toBe(1);
  });

  it('load the kit when a groove is picked, and play nothing when drums are off', () => {
    const before = calls().drumLoads;
    setDrumGroove('shuffle');
    expect(calls().drumLoads).toBeGreaterThan(before);
    setDrumGroove('off');
    play();
    calls().schedule[0](tick(1, 0));
    expect(calls().drums).toHaveLength(0);
  });

  it('only play on the beat itself, not on every subdivision tick', () => {
    setDrumGroove('rock');
    play();
    calls().schedule[0]({ ...tick(1, 0), subIndex: 1, subsPerBeat: 2 });
    expect(calls().drums).toHaveLength(0);
  });

  it('stop cancels hits already scheduled ahead', () => {
    setDrumGroove('rock');
    act(() => startJam());
    act(() => stopJam());
    expect(calls().drumCancels).toBeGreaterThan(0);
  });
});

it('stop silences the reverb tail too (it would ring on for seconds); play brings it back', () => {
  act(() => startJam());
  expect(calls().reverb.at(-1)).toBe('restore');
  act(() => stopJam());
  expect(calls().reverb.at(-1)).toBe('silence');
});

describe('mixer', () => {
  it('mutes and solos: soloing a track silences the others', () => {
    expect(trackGains(DEFAULT_MIX)).toEqual({ pad: DEFAULT_MIX.pad.volume / 100, drums: DEFAULT_MIX.drums.volume / 100, bass: DEFAULT_MIX.bass.volume / 100 });
    const mix = { pad: { ...DEFAULT_MIX.pad, volume: 50 }, drums: { ...DEFAULT_MIX.drums, volume: 100 }, bass: { ...DEFAULT_MIX.bass, volume: 100 } };
    expect(trackGains({ ...mix, pad: { ...mix.pad, muted: true } })).toEqual({ pad: 0, drums: 1, bass: 1 });
    expect(trackGains({ ...mix, drums: { ...mix.drums, solo: true } })).toEqual({ pad: 0, drums: 1, bass: 0 });
    // Mute wins over solo.
    expect(trackGains({ ...mix, drums: { ...mix.drums, solo: true, muted: true } })).toEqual({ pad: 0, drums: 0, bass: 0 });
  });

  it('the reverb send belongs to the mixer, not the sound: switching sound leaves it alone', () => {
    const next = setPadPatch('glass');
    expect(next).not.toHaveProperty('reverbAmount');
  });
});

describe('voicing', () => {
  const play = (chords: JamChord[]) => {
    act(() => startJam());   // (rebuilds the queue from the key — set ours after)
    act(() => setJam({ isPlaying: true, countIn: 0, barsPerChord: 1, currentChordIndex: 0, chordQueue: chords }));
    const onTick = calls().schedule[0];
    chords.forEach((_, bar) => onTick(tick(bar)));
  };

  it('voice-leads: from C to F the upper voices barely move (shared notes held)', () => {
    play([chord('C', 60), chord('F', 65)]);
    const c = chordAt(0, 4), f = chordAt(4, 8);
    const upper = (v: number[]) => [...v].sort((a, b) => a - b).slice(1);
    upper(f).forEach((n, i) => expect(Math.abs(n - upper(c)[i])).toBeLessThanOrEqual(2));
  });

  it('color adds the 7ths', () => {
    setChordColor('7ths');
    play([chord('C', 60)]);
    expect(pcs(chordAt(0))).toEqual([0, 4, 7, 11]);
  });
});

describe('bass', () => {
  beforeEach(() => setBassPattern('walking'));
  afterEach(() => setBassPattern('bar'));

  it('by default plays just the root at the start of each bar', () => {
    setBassPattern('bar');
    const onTick = play();
    for (let b = 0; b < 4; b++) onTick(tick(1, b));
    expect(calls().bass).toHaveLength(1);
    expect(calls().bass[0].midi % 12).toBe(0);
    expect(calls().bass[0].dur).toBeGreaterThan(1.5);   // most of the 2 s bar
  });

  it('eighth notes land on the beats and the "and"s', () => {
    setBassPattern('eighths');
    const onTick = play();
    onTick(tick(1, 0));
    expect(calls().bass.map(b => b.time)).toEqual([1, 1.25]);
  });

  function play() {
    act(() => startJam());
    act(() => setJam({ isPlaying: true, countIn: 1, barsPerChord: 1, currentChordIndex: 0, chordQueue: [chord('C', 60), chord('F', 65)] }));
    return calls().schedule[0];
  }

  it('is silent during the count-in, then plays the root on 1 and the fifth on 3, low', () => {
    const onTick = play();
    for (let b = 0; b < 4; b++) onTick(tick(0, b));
    expect(calls().bass).toHaveLength(0);
    onTick(tick(1, 0));
    onTick(tick(1, 2));
    const [root, fifth] = calls().bass;
    expect(root.midi % 12).toBe(0);
    expect(root.midi).toBeLessThan(52);
    expect(fifth.midi - root.midi === 7 || fifth.midi - root.midi === -5).toBe(true);
  });

  it('walks into the next chord with a passing note on the last beat', () => {
    const onTick = play();
    onTick(tick(1, 0)); onTick(tick(1, 2)); onTick(tick(1, 3));
    const approach = calls().bass.at(-1)!;
    // C up to F: E (a step below F) — or G coming down.
    expect([4, 7]).toContain(approach.midi % 12);
  });

  it('stop silences the bass', () => {
    play();
    act(() => stopJam());
    expect(calls().bassPanic).toBeGreaterThan(0);
  });
});
