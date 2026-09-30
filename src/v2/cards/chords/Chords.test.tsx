import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChordsFace } from './ChordsFace';
import { ChordsSheet } from './ChordsSheet';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getCard } from '../registry';

const chord = () => useStore.getState().note.selectedChord;
beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  useStore.getState().setSelectedNote('C');
  useStore.getState().setSelectedScale('Major (Ionian)');
}));

it('is a small card that lists chord concepts', () => {
  expect(getCard('chord')).toMatchObject({ title: 'Chords', size: { colSpan: 3, rowSpan: 6 } });
  expect(getCard('chord')?.concepts).toEqual(['triads', 'chords-in-a-key']);
});

it('shows the seven chords of the key; picking one selects it (and again clears it)', () => {
  render(<ChordsFace />);
  expect(screen.getAllByRole('button', { name: /^[A-G][#b]?(m|°|\+)?, / })).toHaveLength(7);
  fireEvent.click(screen.getByRole('button', { name: 'Am, vi' }));
  expect(chord()).toMatchObject({ note: 'A', type: 'minor', roman: 'vi' });
  expect(screen.getByTestId('hero-value')).toHaveTextContent('Am');
  expect(screen.getByText('vi · minor')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Am, vi' }));
  expect(chord()).toBeNull();
});

it('the key button opens the Chords card\'s own settings', () => {
  render(<ChordsFace />);
  fireEvent.click(screen.getByRole('button', { name: /C Ionian/ }));
  expect(useV2Store.getState().overlay).toEqual({ kind: 'cardSheet', cardId: 'chord' });
});

it('sheet has the key picker and a Clear for the selected chord', () => {
  act(() => useStore.getState().setSelectedChord({ note: 'A', type: 'minor', symbol: 'm', roman: 'vi' }));
  render(<MemoryRouter><ChordsSheet /></MemoryRouter>);
  expect(screen.getByRole('radiogroup', { name: 'Key' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Clear chord' }));
  expect(chord()).toBeNull();
});
