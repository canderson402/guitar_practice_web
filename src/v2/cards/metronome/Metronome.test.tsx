import React from 'react';
import { render as rtlRender, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MetronomeFace } from './MetronomeFace';
import { MetronomeSheet } from './MetronomeSheet';
import { useStore } from '../../../store/useStore';
import { getCard } from '../registry';


// Sheets are rendered inside a router like the app.
const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => act(() => {
  useStore.setState(st => ({ metronome: { ...st.metronome, bpm: 100, isPlaying: false, beatsPerMeasure: 4 } }));
}));
afterEach(() => act(() => useStore.getState().setMetronomePlaying(false)));

it('is registered as a small card', () => {
  expect(getCard('metronome')).toMatchObject({ title: 'Metronome', size: { colSpan: 3 } });
});

it('face shows BPM, steps it within range, and plays the shared transport', () => {
  render(<MetronomeFace />);
  expect(screen.getByText('100')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 5' }));
  expect(useStore.getState().metronome.bpm).toBe(105);
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(useStore.getState().metronome.isPlaying).toBe(true);
});

it('sheet includes tempo', () => {
  render(<MetronomeSheet />);
  fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 1' }));
  expect(useStore.getState().metronome.bpm).toBe(101);
});

it('sheet edits time signature, subdivision, accent and sound in the shared store', () => {
  render(<MetronomeSheet />);
  fireEvent.click(screen.getByRole('radio', { name: '3/4' }));
  expect(useStore.getState().metronome.beatsPerMeasure).toBe(3);
  fireEvent.click(screen.getByRole('radio', { name: '6/8' }));
  expect(useStore.getState().metronome.beatsPerMeasure).toBe(6);
  expect(useStore.getState().metronome.beatUnit).toBe(8);
  expect(screen.getByRole('button', { name: /^Beats per bar:/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Eighth notes' }));
  expect(useStore.getState().metronome.subdivision).toBe('eighth');
  const accent = screen.getByRole('switch', { name: 'Accent first beat' });
  const before = useStore.getState().metronome.emphasizeFirstBeat;
  fireEvent.click(accent);
  expect(useStore.getState().metronome.emphasizeFirstBeat).toBe(!before);
  fireEvent.click(screen.getByRole('radio', { name: 'Synth' }));
  expect(useStore.getState().metronome.soundType).toBe('synth');
});

it('the big BPM on the face can be clicked to type a tempo', () => {
  render(<MetronomeFace />);
  fireEvent.click(screen.getByRole('button', { name: 'Tempo: 100, click to type' }));
  const input = screen.getByRole('spinbutton', { name: 'Tempo' });
  fireEvent.change(input, { target: { value: '88' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(useStore.getState().metronome.bpm).toBe(88);
});

it('the sheet has no links', () => {
  render(<MetronomeSheet />);
  expect(screen.queryAllByRole('link')).toHaveLength(0);
});

it('the face has a quick subdivision picker', () => {
  render(<MetronomeFace />);
  const sub = screen.getByRole('radiogroup', { name: 'Subdivision' });
  fireEvent.click(within(sub).getByRole('radio', { name: 'Sixteenth notes' }));
  expect(useStore.getState().metronome.subdivision).toBe('sixteenth');
  fireEvent.click(within(sub).getByRole('radio', { name: 'Quarter notes' }));
  expect(useStore.getState().metronome.subdivision).toBe('quarter');
});

it('the face fits a small card: tempo steps and Play share a row, the subdivisions below', () => {
  render(<MetronomeFace />);
  const row = screen.getByTestId('metronome-transport');
  expect(within(row).getByRole('button', { name: 'Play' })).toBeInTheDocument();
  expect(within(row).getByRole('button', { name: 'Increase tempo by 1' })).toBeInTheDocument();
  expect(within(row).queryByRole('radiogroup', { name: 'Subdivision' })).toBeNull();
});

describe('tempo ladder', () => {
  beforeEach(() => act(() => useStore.getState().setTempoLadder({ on: false, start: 80, top: 120, step: 5, every: 4, seconds: 120, unit: 'bars' })));

  it('settings: a "Tempo ladder" section sets it up — on, start, top, step, every N bars', () => {
    render(<MetronomeSheet />);
    fireEvent.click(screen.getByRole('button', { name: /tempo ladder/i }));
    fireEvent.click(screen.getByRole('switch', { name: 'Tempo ladder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase ladder top tempo by 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase ladder step by 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decrease ladder bars by 1' }));
    expect(useStore.getState().tempoLadder).toMatchObject({ on: true, start: 80, top: 125, step: 6, every: 3, unit: 'bars' });
  });

  it('settings: or every so much time — one field, minutes : seconds', () => {
    render(<MetronomeSheet />);
    fireEvent.click(screen.getByRole('button', { name: /tempo ladder/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'Time' }));
    expect(screen.queryByRole('button', { name: 'Decrease ladder bars by 1' })).toBeNull();
    const field = screen.getByRole('group', { name: 'Ladder time' });
    expect(field).toHaveTextContent('2:00');
    fireEvent.click(within(field).getByRole('button', { name: /minutes/i }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minutes' }), { target: { value: '3' } });
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Minutes' }), { key: 'Enter' });
    fireEvent.click(within(field).getByRole('button', { name: /seconds/i }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Seconds' }), { target: { value: '5' } });
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Seconds' }), { key: 'Enter' });
    expect(useStore.getState().tempoLadder).toMatchObject({ unit: 'time', seconds: 185 });
    expect(field).toHaveTextContent('3:05');
  });

  it('is off by default, and the card face never shows it (it lives in settings)', () => {
    expect(useStore.getInitialState().tempoLadder.on).toBe(false);
    act(() => useStore.getState().setTempoLadder({ on: true }));
    render(<MetronomeFace />);
    expect(screen.queryByText(/ladder/i)).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Tempo ladder' })).toBeNull();
  });
});
