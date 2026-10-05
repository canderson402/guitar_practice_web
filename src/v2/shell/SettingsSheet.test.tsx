import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsSheet } from './SettingsSheet';
import { useV2Store } from '../state/useV2Store';
import { useStore } from '../../store/useStore';

beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  useV2Store.getState().setOverlay({ kind: 'settings' });
  useStore.getState().setTuning(['E', 'B', 'G', 'D', 'A', 'E']);
}));

const tuning = () => useStore.getState().note.tuning;

it('builds any tuning by nudging individual strings (e.g. DADGAD)', () => {
  render(<MemoryRouter><SettingsSheet /></MemoryRouter>);
  // Strings are listed low → high: string 6 (low E) first.
  fireEvent.click(screen.getByRole('button', { name: 'Lower string 6 (E)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lower string 6 (Eb)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lower string 2 (B)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lower string 2 (Bb)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lower string 1 (E)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Lower string 1 (Eb)' }));
  expect(tuning()).toEqual(['D', 'A', 'G', 'D', 'A', 'D']);
  expect(screen.getByText(/Tuning · Custom/)).toBeInTheDocument();
});

it('shifts all strings and applies presets', () => {
  render(<MemoryRouter><SettingsSheet /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Lower all strings' }));
  expect(tuning()).toEqual(['Eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb']);
  expect(screen.getByText(/Tuning · Half step down/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Drop D' }));
  expect(tuning()).toEqual(['E', 'B', 'G', 'D', 'A', 'D']);
});

describe('reference pitch', () => {
  it('above the strings: A4 = 440 Hz by default; type any value (decimals too), saved with your settings', () => {
    render(<MemoryRouter><SettingsSheet /></MemoryRouter>);
    expect(useV2Store.getState().referencePitch).toBe(440);
    fireEvent.click(screen.getByRole('button', { name: 'Reference pitch (A4, Hz): 440, click to type' }));
    const input = screen.getByRole('spinbutton', { name: 'Reference pitch (A4, Hz)' });
    fireEvent.change(input, { target: { value: '432.5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useV2Store.getState().referencePitch).toBe(432.5);
    expect(screen.getByText(/432\.5/)).toBeInTheDocument();
  });

  it('a quick way back to 440, shown only when it\'s been changed', () => {
    act(() => useV2Store.getState().setReferencePitch(415));
    render(<MemoryRouter><SettingsSheet /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to 440 Hz' }));
    expect(useV2Store.getState().referencePitch).toBe(440);
    expect(screen.queryByRole('button', { name: 'Reset to 440 Hz' })).toBeNull();
  });

  it('keeps it to a sensible range', () => {
    act(() => useV2Store.getState().setReferencePitch(5));
    expect(useV2Store.getState().referencePitch).toBe(200);
  });
});

describe('reference tone', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tone = require('../../audio/referenceTone');
  beforeEach(() => {
    jest.spyOn(tone, 'startReferenceTone').mockImplementation(() => {});
    jest.spyOn(tone, 'stopReferenceTone').mockImplementation(() => {});
    jest.spyOn(tone, 'setReferenceToneFrequency').mockImplementation(() => {});
  });

  it('App settings has a play button next to the Hz that plays a sine at that pitch, and stops it', () => {
    act(() => useV2Store.getState().setReferencePitch(432));
    render(<MemoryRouter><SettingsSheet /></MemoryRouter>);
    const play = screen.getByRole('button', { name: 'Play a 432 Hz test tone' });
    expect(play).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(play);
    expect(tone.startReferenceTone).toHaveBeenCalledWith(432);
    expect(play).toHaveAttribute('aria-pressed', 'true');
    act(() => useV2Store.getState().setReferencePitch(440));
    expect(tone.setReferenceToneFrequency).toHaveBeenCalledWith(440);
    fireEvent.click(screen.getByRole('button', { name: 'Play a 440 Hz test tone' }));
    expect(tone.stopReferenceTone).toHaveBeenCalled();
  });

  it('closing settings stops the tone', () => {
    const { unmount } = render(<MemoryRouter><SettingsSheet /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /test tone/ }));
    (tone.stopReferenceTone as jest.Mock).mockClear();
    unmount();
    expect(tone.stopReferenceTone).toHaveBeenCalled();
  });
});

describe('reference tone stops by itself', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tone = require('../../audio/referenceTone');
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(tone, 'startReferenceTone').mockImplementation(() => {});
    jest.spyOn(tone, 'stopReferenceTone').mockImplementation(() => {});
    jest.spyOn(tone, 'setReferenceToneFrequency').mockImplementation(() => {});
  });
  afterEach(() => jest.useRealTimers());

  it('after 2 seconds (changing the pitch while it plays gives you another 2)', () => {
    render(<MemoryRouter><SettingsSheet /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /test tone/ }));
    act(() => { jest.advanceTimersByTime(1500); });
    act(() => useV2Store.getState().setReferencePitch(442));
    act(() => { jest.advanceTimersByTime(1500); });
    expect(tone.stopReferenceTone).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(600); });
    expect(tone.stopReferenceTone).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /test tone/ })).toHaveAttribute('aria-pressed', 'false');
  });
});
