import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimerFace } from './TimerFace';
import { TimerSheet } from './TimerSheet';
import { useStore } from '../../../store/useStore';

const t = () => useStore.getState().timer;
beforeEach(() => act(() => {
  const st = useStore.getState();
  st.setTimerRunning(false); st.setTimerMode('countUp'); st.setElapsedSeconds(125); st.setTargetSeconds(1200);
}));

it('shows mm:ss and starts, pauses and resets the shared timer', () => {
  render(<TimerFace />);
  expect(screen.getByText('02:05')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  expect(t().isRunning).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(t().isRunning).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(t().elapsedSeconds).toBe(0);
});

it('sheet switches to count down from the target and adjusts the target', () => {
  render(<TimerSheet />);
  fireEvent.click(screen.getByRole('radio', { name: 'Count down' }));
  expect(t().mode).toBe('countDown');
  expect(t().elapsedSeconds).toBe(1200);
  fireEvent.click(screen.getByRole('button', { name: 'Increase target minutes by 5' }));
  expect(t().targetSeconds).toBe(1500);
  expect(t().elapsedSeconds).toBe(1500);
});
