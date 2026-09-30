import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { useShortcuts } from './useShortcuts';
import { useStore } from '../../store/useStore';
import { useV2Store } from '../state/useV2Store';

const Harness = () => { useShortcuts(); return <div><input aria-label="name" /><input type="range" aria-label="vol" /></div>; };
const m = () => useStore.getState().metronome;

beforeEach(() => {
  act(() => {
    useStore.setState(st => ({ metronome: { ...st.metronome, isPlaying: false, bpm: 100 } }));
    useV2Store.setState(useV2Store.getInitialState(), true);
  });
});
afterEach(() => act(() => useStore.getState().setMetronomePlaying(false)));

it('Space toggles play/stop; arrows change BPM; K opens the key pop-up', () => {
  render(<Harness />);
  fireEvent.keyDown(window, { key: ' ' });
  expect(m().isPlaying).toBe(true);
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  expect(m().bpm).toBe(101);
  fireEvent.keyDown(window, { key: 'ArrowDown', shiftKey: true });
  expect(m().bpm).toBe(96);
  fireEvent.keyDown(window, { key: 'k' });
  expect(useV2Store.getState().popover).toBe('key');
});

it('ignores keys while typing or on a slider, and with modifiers', () => {
  render(<Harness />);
  fireEvent.keyDown(screen.getByLabelText('name'), { key: ' ' });
  fireEvent.keyDown(screen.getByLabelText('vol'), { key: 'ArrowUp' });
  fireEvent.keyDown(window, { key: 'ArrowUp', metaKey: true });
  expect(m().isPlaying).toBe(false);
  expect(m().bpm).toBe(100);
});

it('clamps BPM at the limits', () => {
  act(() => useStore.getState().setBpm(300));
  render(<Harness />);
  fireEvent.keyDown(window, { key: 'ArrowUp', shiftKey: true });
  expect(m().bpm).toBe(300);
});

it('ignores keys aimed at keyboard-draggable handles (card headers)', () => {
  render(<><Harness /><header role="button" tabIndex={0} aria-roledescription="sortable" aria-label="Metronome card" /></>);
  const handle = screen.getByRole('button', { name: 'Metronome card' });
  fireEvent.keyDown(handle, { key: ' ' });
  fireEvent.keyDown(handle, { key: 'ArrowUp' });
  expect(m().isPlaying).toBe(false);
  expect(m().bpm).toBe(100);
});

it('held Space (key repeat) does not re-toggle playback; held arrows keep ramping BPM', () => {
  render(<Harness />);
  fireEvent.keyDown(window, { key: ' ' });
  fireEvent.keyDown(window, { key: ' ', repeat: true });
  expect(m().isPlaying).toBe(true);
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  fireEvent.keyDown(window, { key: 'ArrowUp', repeat: true });
  expect(m().bpm).toBe(102);
});
