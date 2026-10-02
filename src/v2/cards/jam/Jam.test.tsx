import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { useTransport } from '../../../audio';
import { getCard } from '../registry';

// The shared engine drives audio; record calls on a global (CRA resets jest.fn mocks).
type EngineCalls = { init: number; start: number; stop: number; patch: string[]; pad: unknown[]; mix: any[]; groove: string[]; color: string[]; bassPattern: string[] };
const engine = (): EngineCalls => (globalThis as unknown as { mockEngine: EngineCalls }).mockEngine;
jest.mock('../../../audio/jamEngine', () => {
  const actual = jest.requireActual('../../../audio/jamEngine');
  const g = () => (globalThis as unknown as { mockEngine: EngineCalls }).mockEngine;
  return {
    ...actual,
    initJam: () => { g().init += 1; },
    startJam: () => { g().start += 1; },
    stopJam: () => { g().stop += 1; },
    setPadPatch: (id: string) => { g().patch.push(id); return actual.padDefaultsFor(jest.requireActual('../../../audio/padSynth').getPatch(id)); },
    setPadSettings: (p: unknown) => { g().pad.push(p); },
    setJamMix: (m: unknown) => { g().mix.push(m); },
    setDrumGroove: (id: string) => { g().groove.push(id); },
    setChordColor: (c: string) => { g().color.push(c); },
    setBassPattern: (p: string) => { g().bassPattern.push(p); },
  };
});
// The click level goes to the audio engine, which jsdom can't run.
jest.mock('../../../audio', () => ({ ...jest.requireActual('../../../audio'), setClickVolume: () => {} }));
// eslint-disable-next-line import/first
import { JamFace } from './JamFace';
// eslint-disable-next-line import/first
import { JamSheet } from './JamSheet';
// eslint-disable-next-line import/first
import { PATCH_OPTIONS } from '../../../audio/jamEngine';

const jam = () => useStore.getState().jam;
const chord = (note: string, roman: string) => ({ note, type: 'major', symbol: '', roman, midi: [60] });

beforeEach(() => act(() => {
  (globalThis as unknown as { mockEngine: EngineCalls }).mockEngine = { init: 0, start: 0, stop: 0, patch: [], pad: [], mix: [], groove: [], color: [], bassPattern: [] };
  useV2Store.setState(useV2Store.getInitialState(), true);
  useStore.setState(s => ({ jam: { ...s.jam, isPlaying: false, mode: 'infinite', currentChordIndex: 0, selectedPreset: null, progression: [],
    chordQueue: [chord('C', 'I'), chord('G', 'V'), chord('D', 'ii'), chord('A', 'vi'), chord('E', 'iii')] } }));
  useStore.getState().setSelectedNote('C');
  useStore.getState().setSelectedScale('Major (Ionian)');
  useStore.getState().setMetronomeMuted(false);
}));

it('is a full-width card', () => {
  expect(getCard('jam')).toMatchObject({ title: 'Jam', size: { colSpan: 12 } });
});

it('face shows the current chord with its numeral, the next one, and what follows', () => {
  act(() => useV2Store.getState().setCardPref('jam', 'color', 'triads'));
  render(<JamFace />);
  expect(engine().init).toBe(1);
  expect(screen.getByTestId('jam-current')).toHaveTextContent('CI');
  expect(screen.getByTestId('jam-next')).toHaveTextContent('GV');
  expect(within(screen.getByRole('list', { name: 'Coming up' })).getAllByRole('listitem').map(li => li.textContent)).toEqual(['D', 'A', 'E']);
});

it('Play starts the jam on the shared transport; Stop stops it', () => {
  render(<JamFace />);
  fireEvent.click(screen.getByRole('button', { name: 'Play jam' }));
  expect(engine().start).toBe(1);
  act(() => useStore.getState().setJamPlaying(true));
  fireEvent.click(screen.getByRole('button', { name: 'Stop jam' }));
  expect(engine().stop).toBe(1);
});

it('face picks the source: endless (real progressions, or key drills), or a chosen progression', () => {
  render(<JamFace />);
  const pattern = screen.getByRole('combobox', { name: 'Pattern' });
  expect(within(pattern).getAllByRole('option')[0]).toHaveTextContent('Endless progressions');
  fireEvent.change(pattern, { target: { value: 'fourths' } });
  expect(jam().algorithm).toBe('fourths');
  fireEvent.click(screen.getByRole('radio', { name: 'Progression' }));
  expect(jam().mode).toBe('preset');
  fireEvent.change(screen.getByRole('combobox', { name: 'Progression' }), { target: { value: 'pop' } });
  expect(jam()).toMatchObject({ selectedPreset: 'pop', progression: [0, 4, 5, 3] });
  expect(useV2Store.getState().cardPrefs.jam.progression).toEqual({ id: 'pop', degrees: [0, 4, 5, 3] });
});

describe('progression maker', () => {
  const open = () => {
    render(<><JamSheet /><JamFace /></>);
    fireEvent.click(screen.getAllByRole('radio', { name: 'Progression' })[0]);
  };

  it('builds your own from the key\'s chords, in order, and can remove them', () => {
    open();
    const maker = screen.getByRole('group', { name: 'Build a progression' });
    ['I', 'vi', 'IV', 'V'].forEach(r => fireEvent.click(within(maker).getByRole('button', { name: `Add ${r}` })));
    expect(jam()).toMatchObject({ selectedPreset: 'custom', progression: [0, 5, 3, 4] });
    expect(within(maker).getByRole('button', { name: 'Add vii°' })).toBeInTheDocument();
    fireEvent.click(within(maker).getByRole('button', { name: 'Remove chord 2 (vi)' }));
    expect(jam().progression).toEqual([0, 3, 4]);
  });

  it('starts from a preset: editing it makes it your own', () => {
    open();
    fireEvent.change(screen.getAllByRole('combobox', { name: 'Progression' })[0], { target: { value: 'pop' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Build a progression' })).getByRole('button', { name: 'Add ii' }));
    expect(jam()).toMatchObject({ selectedPreset: 'custom', progression: [0, 4, 5, 3, 1] });
  });

  it('saves your progressions, to pick again later (or delete)', () => {
    open();
    const maker = screen.getByRole('group', { name: 'Build a progression' });
    ['ii', 'V', 'I'].forEach(r => fireEvent.click(within(maker).getByRole('button', { name: `Add ${r}` })));
    fireEvent.click(within(maker).getByRole('button', { name: 'Save progression' }));
    const saved = useV2Store.getState().cardPrefs.jam.progressions as Array<{ id: string; degrees: number[] }>;
    expect(saved).toHaveLength(1);
    expect(saved[0].degrees).toEqual([1, 4, 0]);
    const select = screen.getAllByRole('combobox', { name: 'Progression' })[0];
    expect(within(select).getByRole('option', { name: 'ii–V–I' })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: saved[0].id } });
    expect(jam().progression).toEqual([1, 4, 0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete ii–V–I' }));
    expect(useV2Store.getState().cardPrefs.jam.progressions).toEqual([]);
  });
});

describe('chord color', () => {
  it('triads, 7ths or lush: remembered, sent to the engine, and the chord names follow', () => {
    render(<><JamSheet /><JamFace /></>);
    fireEvent.change(screen.getByRole('combobox', { name: 'Chord color' }), { target: { value: '7ths' } });
    expect(useV2Store.getState().cardPrefs.jam.color).toBe('7ths');
    expect(engine().color.at(-1)).toBe('7ths');
    expect(screen.getByTestId('jam-current')).toHaveTextContent('Cmaj7');
    expect(screen.getByTestId('jam-next')).toHaveTextContent('Gmaj7');
  });
});

it('face counts down from the shared transport while playing', () => {
  act(() => { useStore.getState().setJamPlaying(true); useStore.getState().setJamCountIn(1); useStore.getState().setJamBarsPerChord(4); });
  act(() => useTransport.setState({ running: true, beatCount: 1, barIndex: 0, beatInBar: 1, beatsPerBar: 4 }));
  render(<JamFace />);
  expect(screen.getByText('Count-in 3')).toBeInTheDocument();
  act(() => useTransport.setState({ running: false, beatCount: -1 }));
});

it('sheet: chords change every N bars (following the time signature) and count-in', () => {
  act(() => useStore.getState().setJamBarsPerChord(4));
  render(<JamSheet />);
  expect(screen.queryByRole('radiogroup', { name: 'Change unit' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Increase bars per chord by 1' }));
  expect(jam().barsPerChord).toBe(5);
  fireEvent.click(screen.getByRole('radio', { name: '2 bars' }));
  expect(jam().countIn).toBe(2);
});

const mixPref = () => useV2Store.getState().cardPrefs.jam?.mix as any;

describe('drums', () => {
  it('the face picks a groove (or none), remembered and sent to the engine', () => {
    render(<JamFace />);
    expect(engine().groove).toEqual(['rock']);   // the saved/default groove is applied on mount
    const drums = screen.getByRole('combobox', { name: 'Drums' });
    expect(within(drums).getAllByRole('option').map(o => o.textContent)).toEqual(['Off', 'Kick only', 'Rock', 'Four on the floor', 'Half-time', 'Shuffle', 'Ballad (ride)']);
    fireEvent.change(drums, { target: { value: 'shuffle' } });
    expect(useV2Store.getState().cardPrefs.jam.groove).toBe('shuffle');
    expect(engine().groove.at(-1)).toBe('shuffle');
    fireEvent.change(drums, { target: { value: 'off' } });
    expect(engine().groove.at(-1)).toBe('off');
  });
});

describe('mixer', () => {
  it('has a strip per track', () => {
    render(<JamSheet />);
    const mixer = screen.getByRole('group', { name: 'Mixer' });
    ['Pad', 'Bass', 'Drums', 'Click'].forEach(t => expect(within(mixer).getByRole('slider', { name: `${t} volume` })).toBeInTheDocument());
    expect(within(mixer).getByRole('slider', { name: 'Pad reverb' })).toBeInTheDocument();
    expect(within(mixer).getByRole('slider', { name: 'Drums reverb' })).toBeInTheDocument();
  });

  it('mute, solo, volume and reverb are remembered and heard immediately', () => {
    render(<><JamSheet /><JamFace /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Mute Pad' }));
    expect(mixPref().pad.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Mute Pad' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Solo Drums' }));
    expect(mixPref().drums.solo).toBe(true);
    fireEvent.change(screen.getByRole('slider', { name: 'Drums volume' }), { target: { value: '40' } });
    expect(mixPref().drums.volume).toBe(40);
    fireEvent.change(screen.getByRole('slider', { name: 'Pad reverb' }), { target: { value: '0.3' } });
    expect(mixPref().pad.reverb).toBe(0.3);
    expect(engine().mix.at(-1)).toMatchObject({ pad: { muted: true, reverb: 0.3 }, drums: { solo: true, volume: 40 } });
  });

  it('the click strip drives the metronome click', () => {
    render(<JamSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Mute Click' }));
    expect(useStore.getState().metronome.muted).toBe(true);
    fireEvent.change(screen.getByRole('slider', { name: 'Click volume' }), { target: { value: '30' } });
    expect(useStore.getState().metronome.volume).toBe(30);
  });

  it('reverb is a mixer send, not a pad setting — switching sound keeps it', () => {
    render(<><JamSheet /><JamFace /></>);
    fireEvent.change(screen.getByRole('slider', { name: 'Pad reverb' }), { target: { value: '0.3' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sound' }), { target: { value: PATCH_OPTIONS[2].value } });
    expect(mixPref().pad.reverb).toBe(0.3);
    fireEvent.click(screen.getByRole('button', { name: /Pad settings/ }));
    expect(screen.queryByRole('slider', { name: 'Reverb' })).toBeNull();
  });
});

it('sheet: choosing a sound loads it and remembers it (with its settings) in the browser', () => {
  render(<><JamSheet /><JamFace /></>);
  const other = PATCH_OPTIONS[1].value;
  fireEvent.change(screen.getByRole('combobox', { name: 'Sound' }), { target: { value: other } });
  expect(engine().patch).toContain(other);
  expect(useV2Store.getState().cardPrefs.jam.patchId).toBe(other);
  expect(useV2Store.getState().cardPrefs.jam.pad).toMatchObject({ stagger: 0 });
});

it('sheet: pad settings are tucked away, adjust the sound, and reset to the sound\'s defaults', () => {
  render(<><JamSheet /><JamFace /></>);
  fireEvent.click(screen.getByRole('button', { name: /Pad settings/ }));
  fireEvent.change(screen.getByRole('slider', { name: 'Cutoff' }), { target: { value: '3000' } });
  expect((useV2Store.getState().cardPrefs.jam.pad as { cutoff: number }).cutoff).toBe(3000);
  expect(engine().pad.at(-1)).toMatchObject({ cutoff: 3000 });
  fireEvent.click(screen.getByRole('button', { name: 'Reset pad settings' }));
  expect((useV2Store.getState().cardPrefs.jam.pad as { cutoff: number }).cutoff).not.toBe(3000);
});

describe('change presets, shared with the Note Trainer', () => {
  it('the face offers the same presets; bar presets set bars per chord, beat and seconds presets don\'t apply', () => {
    act(() => useV2Store.getState().setChangePresets([{ mode: 'beats', interval: 8 }, { mode: 'bars', interval: 2 }, { mode: 'time', interval: 30 }]));
    render(<JamFace />);
    fireEvent.click(screen.getByRole('button', { name: '2 bars' }));
    expect(jam().barsPerChord).toBe(2);
    expect(screen.getByRole('button', { name: '2 bars' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '8 beats' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '30 sec' })).toBeDisabled();
  });

  it('a preset saved from Jam shows up in the shared list', () => {
    act(() => useStore.getState().setJamBarsPerChord(3));
    render(<JamSheet />);
    fireEvent.click(screen.getByRole('button', { name: 'Save 3 bars as a preset' }));
    expect(useV2Store.getState().changePresets?.at(-1)).toEqual({ mode: 'bars', interval: 3 });
  });
});

describe('bass pattern', () => {
  it('a few patterns, tame ones first; the choice is remembered and sent to the engine', () => {
    render(<><JamSheet /><JamFace /></>);
    expect(engine().bassPattern).toEqual(['bar']);   // the default, applied on mount
    const select = screen.getByRole('combobox', { name: 'Bass pattern' });
    expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual(['Held', 'Root on 1', 'Quarter notes', 'Eighth notes', 'Root & fifth', 'Walking']);
    fireEvent.change(select, { target: { value: 'quarters' } });
    expect(useV2Store.getState().cardPrefs.jam.bassPattern).toBe('quarters');
    expect(engine().bassPattern.at(-1)).toBe('quarters');
  });
});

describe('quick track toggles on the face', () => {
  it('turn the click, drums, pad and bass on and off — the same switch as the mixer\'s mute', () => {
    render(<><JamFace /><JamSheet /></>);
    const tracks = screen.getByRole('group', { name: 'Tracks' });
    ['Click', 'Drums', 'Pad', 'Bass'].forEach(t => expect(within(tracks).getByRole('button', { name: t })).toHaveAttribute('aria-pressed', 'true'));
    fireEvent.click(within(tracks).getByRole('button', { name: 'Pad' }));
    expect(mixPref().pad.muted).toBe(true);
    expect(within(tracks).getByRole('button', { name: 'Pad' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Mute Pad' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(tracks).getByRole('button', { name: 'Click' }));
    expect(useStore.getState().metronome.muted).toBe(true);
    fireEvent.click(within(tracks).getByRole('button', { name: 'Drums' }));
    expect(mixPref().drums.muted).toBe(true);
  });
});
