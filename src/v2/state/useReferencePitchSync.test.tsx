import React from 'react';
import { render, act } from '@testing-library/react';
import { useV2Store } from './useV2Store';
import { useReferencePitchSync } from './useReferencePitchSync';
import { getReferencePitch, setReferencePitch } from '../../audio/pitch';

const Probe: React.FC = () => { useReferencePitchSync(); return null; };

afterEach(() => { setReferencePitch(440); act(() => useV2Store.getState().setReferencePitch(440)); });

it('the saved reference pitch reaches the audio engine, and follows changes', () => {
  act(() => useV2Store.getState().setReferencePitch(415));
  render(<Probe />);
  expect(getReferencePitch()).toBe(415);
  act(() => useV2Store.getState().setReferencePitch(442));
  expect(getReferencePitch()).toBe(442);
});
