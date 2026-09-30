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
