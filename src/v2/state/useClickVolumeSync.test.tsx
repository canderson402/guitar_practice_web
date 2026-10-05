import React from 'react';
import { render, act } from '@testing-library/react';
import { useStore } from '../../store/useStore';
import { useClickVolumeSync } from './useClickVolumeSync';

const volumes: number[] = [];
jest.mock('../../audio/click', () => ({ setClickVolume: (v: number) => { volumes.push(v); } }));

const Probe: React.FC = () => { useClickVolumeSync(); return null; };

it('the metronome volume setting reaches the click from the start, and follows changes', () => {
  act(() => useStore.getState().setMetronomeVolume(80));
  render(<Probe />);
  expect(volumes.at(-1)).toBe(0.8);
  act(() => useStore.getState().setMetronomeVolume(25));
  expect(volumes.at(-1)).toBe(0.25);
});
