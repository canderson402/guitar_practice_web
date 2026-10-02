import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react';
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
