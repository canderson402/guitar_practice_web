import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScaleFace } from './ScaleFace';
import { ScaleSheet } from './ScaleSheet';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getCard } from '../registry';

const n = () => useStore.getState().note;
beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  const st = useStore.getState();
  st.setSelectedNote('A'); st.setSelectedScale('Aeolian (Natural Minor)');
  st.setCurrentNoteIndex(2); st.setChangeMode('none'); st.setRandomize(false); st.setShowNextNote(true);
}));

const face = () => render(<MemoryRouter><ScaleFace /></MemoryRouter>);

it('shows the key and the current note with its interval — no inline ? marks (one per card, in the header)', () => {
  act(() => useV2Store.getState().setNoteSelected(true));
  face();
  expect(screen.getByRole('button', { name: /A Aeolian/ })).toBeInTheDocument();
  expect(screen.getByText('♭3 · minor third')).toBeInTheDocument();
  expect(screen.queryAllByRole('link')).toHaveLength(0);
});

it('key button opens the Scale card\'s own settings, not the dock pop-up', () => {
  face();
  fireEvent.click(screen.getByRole('button', { name: /A Aeolian/ }));
  expect(useV2Store.getState().overlay).toEqual({ kind: 'cardSheet', cardId: 'scale' });
  expect(useV2Store.getState().popover).toBeNull();
});

it('starts with no note selected; tapping a note selects it, tapping it again deselects (like a chord)', () => {
  face();
  expect(useV2Store.getState().noteSelected).toBe(false);
  expect(screen.getByTestId('hero-value')).toHaveTextContent('—');
  expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'E, 5' }));
  expect(useV2Store.getState().noteSelected).toBe(true);
  expect(screen.getByRole('button', { name: 'E, 5' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('hero-value')).toHaveTextContent('E');
  fireEvent.click(screen.getByRole('button', { name: 'E, 5' }));
  expect(useV2Store.getState().noteSelected).toBe(false);
  expect(screen.getByRole('button', { name: 'E, 5' })).toHaveAttribute('aria-pressed', 'false');
});

it('tapping a note jumps to it', () => {
  face();
  fireEvent.click(screen.getByRole('button', { name: 'E, 5' }));
  expect(n().currentNoteIndex).toBe(4);
});

it('has no "Next …" line or Next button (the next note is outlined on its chip)', () => {
  face();
  expect(screen.queryByRole('button', { name: 'Next note' })).toBeNull();
  expect(screen.queryByText(/^Next/)).toBeNull();
});

it('sheet includes the key and scale picker', () => {
  render(<ScaleSheet />);
  fireEvent.click(screen.getByRole('radio', { name: 'E' }));
  expect(n().selectedNote).toBe('E');
  expect(screen.getByRole('radio', { name: 'Aeolian (Natural Minor)' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('radio', { name: 'Ionian (Major)' }));
  expect(n().selectedScale).toBe('Major (Ionian)');
});

it('auto-advance settings live in a collapsed "Auto-advance" section', () => {
  render(<ScaleSheet />);
  expect(screen.getByRole('button', { name: /Auto-advance/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('radio', { name: 'Bars' })).toBeNull();
});

it('sheet edits auto-advance, interval, order and show-next', () => {
  render(<ScaleSheet />);
  fireEvent.click(screen.getByRole('button', { name: /Auto-advance/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'Bars' }));
  expect(n().changeMode).toBe('bars');
  const before = n().changeInterval;
  fireEvent.click(screen.getByRole('button', { name: 'Increase change every by 1' }));
  expect(n().changeInterval).toBe(before + 1);
  fireEvent.click(screen.getByRole('radio', { name: 'Random' }));
  expect(n().randomize).toBe(true);
  fireEvent.click(screen.getByRole('switch', { name: 'Show next note' }));
  expect(n().showNextNote).toBe(false);
});

it('shows all twelve notes for the Chromatic scale', () => {
  act(() => useStore.getState().setSelectedScale('Chromatic'));
  face();
  expect(screen.getAllByRole('button', { name: /^[A-G][#b]?, / })).toHaveLength(12);
});

it('is a small card, the same height as the other small cards', () => {
  expect(getCard('scale')?.size).toEqual(getCard('metronome')?.size);
});

it('"Show next note" is off by default', () => {
  expect(useStore.getInitialState().note.showNextNote).toBe(false);
});
