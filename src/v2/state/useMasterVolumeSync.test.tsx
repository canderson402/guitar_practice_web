import React from 'react';
import { render, act } from '@testing-library/react';
import { useStore } from '../../store/useStore';
import { useMasterVolumeSync } from './useMasterVolumeSync';

const volumes: number[] = [];
jest.mock('../../audio', () => ({ setMasterVolume: (v: number) => { volumes.push(v); } }));

const Probe: React.FC = () => { useMasterVolumeSync(); return null; };

it('master volume reaches the output, and master mute silences it (keeping the level for unmute)', () => {
  act(() => { useStore.getState().setJamMixerVolume('master', 70); useStore.getState().setMasterMuted(false); });
  render(<Probe />);
  expect(volumes.at(-1)).toBe(0.7);
  act(() => useStore.getState().setMasterMuted(true));
  expect(volumes.at(-1)).toBe(0);
  act(() => useStore.getState().setMasterMuted(false));
  expect(volumes.at(-1)).toBe(0.7);
});
