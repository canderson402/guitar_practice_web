import React from 'react';
import { render, act } from '@testing-library/react';
import { useTimerClock } from './useTimerClock';
import { useStore } from '../../store/useStore';

const Harness = () => { useTimerClock(); return null; };
const t = () => useStore.getState().timer;
let now = 0;

beforeEach(() => {
  jest.useFakeTimers();
  now = 0;
  jest.spyOn(performance, 'now').mockImplementation(() => now);
  act(() => { const st = useStore.getState(); st.setTimerRunning(false); st.setTimerMode('countUp'); st.setElapsedSeconds(0); });
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

const tick = (ms: number) => act(() => { now += ms; jest.advanceTimersByTime(ms); });

it('counts up from wall-clock time, not interval ticks', () => {
  render(<Harness />);
  act(() => useStore.getState().setTimerRunning(true));
  tick(2600);
  expect(t().elapsedSeconds).toBe(2);
});

it('counts down and stops at zero', () => {
  act(() => { const st = useStore.getState(); st.setTimerMode('countDown'); st.setElapsedSeconds(2); });
  render(<Harness />);
  act(() => useStore.getState().setTimerRunning(true));
  tick(3000);
  expect(t().elapsedSeconds).toBe(0);
  expect(t().isRunning).toBe(false);
});
