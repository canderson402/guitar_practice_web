import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { useTransport } from '../../../audio';
import { getCard } from '../registry';

// The shared engine drives audio; record calls on a global (CRA resets jest.fn mocks).
type EngineCalls = { init: number; start: number; stop: number; patch: string[]; pad: unknown[]; volume: Array<[number, boolean]> };
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
    setPadVolume: (v: number, m: boolean) => { g().volume.push([v, m]); },
  };
});
// eslint-disable-next-line import/first
import { JamFace } from './JamFace';
// eslint-disable-next-line import/first
import { JamSheet } from './JamSheet';
// eslint-disable-next-line import/first
import { PATCH_OPTIONS } from '../../../audio/jamEngine';

const jam = () => useStore.getState().jam;
const chord = (note: string, roman: string) => ({ note, type: 'major', symbol: '', roman, midi: [60] });

beforeEach(() => act(() => {
  (globalThis as unknown as { mockEngine: EngineCalls }).mockEngine = { init: 0, start: 0, stop: 0, patch: [], pad: [], volume: [] };
  useV2Store.setState(useV2Store.getInitialState(), true);
  useStore.setState(s => ({ jam: { ...s.jam, isPlaying: false, mode: 'infinite', currentChordIndex: 0,
    chordQueue: [chord('C', 'I'), chord('G', 'V'), chord('D', 'ii'), chord('A', 'vi'), chord('E', 'iii')] } }));
}));

it('is a full-width card', () => {
  expect(getCard('jam')).toMatchObject({ title: 'Jam', size: { colSpan: 12 } });
});

it('face shows the current chord with its numeral, the next one, and what follows', () => {
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

it('face picks the source: an infinite pattern, or a preset progression', () => {
  render(<JamFace />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Pattern' }), { target: { value: 'fourths' } });
  expect(jam().algorithm).toBe('fourths');
  fireEvent.click(screen.getByRole('radio', { name: 'Preset' }));
  expect(jam().mode).toBe('preset');
  fireEvent.change(screen.getByRole('combobox', { name: 'Progression' }), { target: { value: 'I - IV - V' } });
  expect(jam().selectedPreset).toBe('I - IV - V');
});

it('face counts down from the shared transport while playing', () => {
  act(() => { useStore.getState().setJamPlaying(true); useStore.getState().setJamCountIn(1); useStore.getState().setJamBarsPerChord(4); });
  act(() => useTransport.setState({ running: true, beatCount: 1, barIndex: 0, beatInBar: 1, beatsPerBar: 4 }));
  render(<JamFace />);
  expect(screen.getByText('Count-in 3')).toBeInTheDocument();
  act(() => useTransport.setState({ running: false, beatCount: -1 }));
});

it('sheet: chords change every N bars (following the time signature), count-in, and pad/click levels', () => {
  act(() => useStore.getState().setJamBarsPerChord(4));
  render(<JamSheet />);
  expect(screen.queryByRole('radiogroup', { name: 'Change unit' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Increase bars per chord by 1' }));
  expect(jam().barsPerChord).toBe(5);
  fireEvent.click(screen.getByRole('radio', { name: '2 bars' }));
  expect(jam().countIn).toBe(2);
  fireEvent.click(screen.getByRole('switch', { name: 'Pad on' }));
  expect(jam().mixer.chords.muted).toBe(true);
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
