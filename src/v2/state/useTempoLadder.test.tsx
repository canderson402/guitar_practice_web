import React from 'react';
import { render, act } from '@testing-library/react';
import { useStore } from '../../store/useStore';
import { useTempoLadder } from './useTempoLadder';

// Beats come from the shared clock; capture the listener and fire bars by hand.
type Beat = { beatInBar: number; barIndex: number };
jest.mock('../../audio/transport', () => ({
  useAudibleBeat: (fn: (ev: Beat) => void) => { (globalThis as any).mockBeat = fn; },
}));
const bar = (barIndex: number) => act(() => (globalThis as any).mockBeat({ beatInBar: 0, barIndex }));
const Host = () => { useTempoLadder(); return null; };
const st = () => useStore.getState();
const play = (on: boolean) => act(() => st().setMetronomePlaying(on));

beforeEach(() => act(() => {
  st().setMetronomePlaying(false);
  st().setBpm(100);
  st().setTempoLadder({ on: true, start: 80, top: 95, step: 5, every: 2, unit: 'bars' });
}));
afterEach(() => jest.useRealTimers());

it('defaults: off, 80 → 120, +5 every 4 bars', () => {
  expect(useStore.getInitialState().tempoLadder).toEqual({ on: false, start: 80, top: 120, step: 5, every: 4, seconds: 120, unit: 'bars' });
});

it('pressing play starts at the start tempo, then steps up every N bars and holds at the top', () => {
  render(<Host />);
  play(true);
  expect(st().metronome.bpm).toBe(80);
  bar(1); expect(st().metronome.bpm).toBe(80);
  bar(2); expect(st().metronome.bpm).toBe(85);
  bar(3); expect(st().metronome.bpm).toBe(85);
  bar(4); expect(st().metronome.bpm).toBe(90);
  bar(6); expect(st().metronome.bpm).toBe(95);
  bar(8); expect(st().metronome.bpm).toBe(95);   // holds at the top
});

it('only steps on the first beat of a bar, and never before the first full segment', () => {
  render(<Host />);
  play(true);
  bar(0);
  act(() => (globalThis as any).mockBeat({ beatInBar: 2, barIndex: 2 }));
  expect(st().metronome.bpm).toBe(80);
});

it('changing the tempo by hand mid-climb continues from there', () => {
  render(<Host />);
  play(true);
  act(() => st().setBpm(88));
  bar(2);
  expect(st().metronome.bpm).toBe(93);
});

it('stop and play again starts the climb over', () => {
  render(<Host />);
  play(true); bar(2); bar(4);
  expect(st().metronome.bpm).toBe(90);
  play(false); play(true);
  expect(st().metronome.bpm).toBe(80);
});

it('off: nothing changes', () => {
  act(() => st().setTempoLadder({ on: false }));
  render(<Host />);
  play(true); bar(2);
  expect(st().metronome.bpm).toBe(100);
});

it('by time: steps every m:ss of playing — pausing doesn\'t count', () => {
  jest.useFakeTimers();
  act(() => st().setTempoLadder({ seconds: 120, unit: 'time', top: 200 }));
  render(<Host />);
  play(true);
  act(() => { jest.advanceTimersByTime(119_000); });
  expect(st().metronome.bpm).toBe(80);
  act(() => { jest.advanceTimersByTime(2_000); });
  expect(st().metronome.bpm).toBe(85);
  bar(2);   // bars don't count in time mode
  expect(st().metronome.bpm).toBe(85);
  act(() => { jest.advanceTimersByTime(120_000); });
  expect(st().metronome.bpm).toBe(90);
  play(false);
  act(() => { jest.advanceTimersByTime(600_000); });
  expect(st().metronome.bpm).toBe(90);
  act(() => st().setTempoLadder({ seconds: 30 }));
  play(true);
  act(() => { jest.advanceTimersByTime(31_000); });
  expect(st().metronome.bpm).toBe(85);
});

it('keeps the settings sensible: top never below start, step and every at least 1', () => {
  act(() => st().setTempoLadder({ start: 150, top: 120, step: 0, every: 0, seconds: 0 }));
  expect(st().tempoLadder).toMatchObject({ start: 150, top: 150, step: 1, every: 1, seconds: 1 });
});
