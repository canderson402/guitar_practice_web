import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
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

it('is a small card', () => {
  expect(getCard('chord')).toMatchObject({ title: 'Chords', size: { colSpan: 3, rowSpan: 6 } });
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

describe('any chord (root + chord type)', () => {
  const openAny = () => { render(<ChordsFace />); fireEvent.click(screen.getByRole('radio', { name: 'Any chord' })); };
  const pickRoot = (note: string) => {
    fireEvent.click(screen.getByRole('button', { name: /^Change root/ }));
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Root' })).getByRole('radio', { name: note }));
  };

  it('no dropdowns: pick a family, then a type chip — e.g. E♭ + maj9 → E♭maj9', () => {
    openAny();
    expect(screen.queryByRole('combobox')).toBeNull();
    pickRoot('Eb');
    expect(screen.queryByRole('radiogroup', { name: 'Root' })).toBeNull();      // the picker closes
    fireEvent.click(screen.getByRole('radio', { name: 'Ext' }));
    fireEvent.click(screen.getByRole('button', { name: 'maj9, major 9th' }));
    expect(chord()).toMatchObject({ note: 'Eb', symbol: 'maj9', intervals: [0, 4, 7, 11, 14] });
    expect(screen.getByTestId('hero-value')).toHaveTextContent('Ebmaj9');
    expect(screen.getByText('1 3 5 7 9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Alt' }));
    fireEvent.click(screen.getByRole('button', { name: 'maj7♭5, major 7th, flat 5' }));
    expect(chord()).toMatchObject({ symbol: 'maj7♭5' });
  });

  it('families: Triads, 6ths, 7ths, Ext, Alt — each shows just its types', () => {
    openAny();
    expect(within(screen.getByRole('radiogroup', { name: 'Chord family' })).getAllByRole('radio').map(r => r.textContent)).toEqual(['Triads', '6ths', '7ths', 'Ext', 'Alt']);
    fireEvent.click(screen.getByRole('radio', { name: '7ths' }));
    expect(screen.getAllByRole('button', { pressed: false }).map(b => b.textContent).filter(t => t && !/Change root/.test(t)))
      .toEqual(expect.arrayContaining(['maj7', '7', 'm7', 'm(maj7)', 'm7♭5', '°7', '7sus4', '+7']));
  });

  it('tap the showing type again to clear it; no ✕ on the card; In key clears a built chord, Any chord shows it again', () => {
    openAny();
    fireEvent.click(screen.getByRole('radio', { name: '7ths' }));
    fireEvent.click(screen.getByRole('button', { name: 'm7, minor 7th' }));
    expect(chord()).toMatchObject({ symbol: 'm7' });
    expect(screen.queryByRole('button', { name: 'Clear chord' })).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'In key' }));
    expect(chord()).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Any chord' }));
    expect(chord()).toMatchObject({ symbol: 'm7' });
    fireEvent.click(screen.getByRole('button', { name: 'm7, minor 7th' }));
    expect(chord()).toBeNull();
  });

  it('the root picker closes with Escape', () => {
    openAny();
    fireEvent.click(screen.getByRole('button', { name: /^Change root/ }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('radiogroup', { name: 'Root' })).toBeNull();
  });

  it('the sheet has the root grid and the types as chips by family — tap the same type again to clear', () => {
    render(<MemoryRouter><ChordsSheet /></MemoryRouter>);
    const builder = screen.getByRole('group', { name: 'Any chord' });
    fireEvent.click(within(builder).getByRole('radio', { name: 'A' }));
    fireEvent.click(within(builder).getByRole('button', { name: 'm7♭5, half-diminished' }));
    expect(chord()).toMatchObject({ note: 'A', symbol: 'm7♭5', intervals: [0, 3, 6, 10] });
    fireEvent.click(within(builder).getByRole('button', { name: 'm7♭5, half-diminished' }));
    expect(chord()).toBeNull();
  });
});
