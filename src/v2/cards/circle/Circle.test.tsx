import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CircleFace } from './CircleFace';
import { CircleSheet } from './CircleSheet';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getCard } from '../registry';

beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  useStore.getState().setSelectedNote('C');
  useStore.getState().setSelectedScale('Major (Ionian)');
}));

it('is a small card', () => {
  expect(getCard('circle-of-fifths')).toMatchObject({ title: 'Circle of fifths', size: { colSpan: 3, rowSpan: 6 } });
});

it('shows all 12 keys in circle order and marks the chords of the current key with Roman numerals', () => {
  render(<CircleFace />);
  const keys = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'));
  expect(keys).toEqual(['C, I', 'G, V', 'D, ii', 'A, vi', 'E, iii', 'B, vii°', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F, IV']);
});

it('follows the shared scale, modes included', () => {
  act(() => useStore.getState().setSelectedScale('Aeolian (Natural Minor)'));
  render(<CircleFace />);
  expect(screen.getByRole('button', { name: 'C, i' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Eb, III' })).toBeInTheDocument();
});

it('clicking a key makes it the current key', () => {
  render(<CircleFace />);
  fireEvent.click(screen.getByRole('button', { name: 'G, V' }));
  expect(useStore.getState().note.selectedNote).toBe('G');
});

it('the inner ring can show relative keys instead', () => {
  act(() => useV2Store.getState().setCardPref('circle-of-fifths', 'ring', 'relatives'));
  render(<CircleFace />);
  expect(screen.getByText('Am')).toBeInTheDocument();
});

it('sheet has the key picker and the inner-ring choice', () => {
  render(<MemoryRouter><CircleSheet /></MemoryRouter>);
  fireEvent.click(screen.getByRole('radio', { name: 'Relative keys' }));
  expect(useV2Store.getState().cardPrefs['circle-of-fifths'].ring).toBe('relatives');
  expect(screen.getByRole('radiogroup', { name: 'Key' })).toBeInTheDocument();
  // Just the key: no mode or scale lists here (the circle is about keys).
  expect(screen.queryByRole('radiogroup', { name: 'Modes' })).toBeNull();
  expect(screen.queryByRole('radiogroup', { name: 'Other' })).toBeNull();
});

it('colors keys by chord quality and dims out-of-key notes, but the current key is always just highlighted', () => {
  act(() => { useStore.getState().setSelectedNote('D'); useStore.getState().setSelectedScale('Locrian'); });
  render(<CircleFace />);
  // CSS modules map to plain class names under Jest.
  const classes = (name: string) => screen.getByRole('button', { name }).className.split(' ').filter(Boolean).sort();
  expect(classes('D, i°')).toEqual(['current', 'key']); // no diminished grey on the pink highlight
  expect(classes('Eb, II')).toEqual(['key', 'major']);
  expect(classes('F, iii')).toEqual(['key', 'minor']);
  expect(classes('A')).toEqual(['dim', 'key']);
});

it('Db Locrian marks all seven chords, at their real pitches', () => {
  act(() => { useStore.getState().setSelectedNote('Db'); useStore.getState().setSelectedScale('Locrian'); });
  render(<CircleFace />);
  const labels = screen.getAllByRole('button').map(b => b.getAttribute('aria-label'));
  expect(labels).toEqual(['C', 'G, V', 'D, II', 'A, VI', 'E, iii', 'B, vii', 'F#, iv', 'Db, i°', 'Ab', 'Eb', 'Bb', 'F']);
});

it('has a legend for the chord-quality colors (only when the ring shows chords)', () => {
  render(<CircleFace />);
  const legend = screen.getByRole('list', { name: 'Chord qualities' });
  expect(within(legend).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Major', 'Minor', 'Diminished']);
  act(() => useV2Store.getState().setCardPref('circle-of-fifths', 'ring', 'relatives'));
  expect(screen.queryByRole('list', { name: 'Chord qualities' })).toBeNull();
});

describe('relative keys', () => {
  beforeEach(() => act(() => useV2Store.getState().setCardPref('circle-of-fifths', 'ring', 'relatives')));
  const classes = (name: string) => screen.getByRole('button', { name }).className.split(' ').filter(Boolean).sort();

  it('looks as before: plain keys, the current key filled and its relative minor in the accent', () => {
    render(<CircleFace />);   // C major
    expect(classes('C')).toEqual(['current', 'key']);
    expect(classes('G')).toEqual(['key']);
    expect(classes('A minor')).toEqual(['minorKey', 'relCurrent', 'ringLabel']);
    expect(classes('E minor')).toEqual(['minorKey', 'ringLabel']);
  });

  it('click a minor key to make it the key (Aeolian); the pair is marked the same way (C filled, Am in the accent)', () => {
    act(() => useStore.getState().setSelectedNote('G'));
    render(<CircleFace />);
    fireEvent.click(screen.getByRole('button', { name: 'A minor' }));
    expect(useStore.getState().note).toMatchObject({ selectedNote: 'A', selectedScale: 'Aeolian (Natural Minor)' });
    expect(classes('C')).toEqual(['current', 'key']);
    expect(classes('A')).toEqual(['key']);
    expect(classes('A minor')).toEqual(['minorKey', 'relCurrent', 'ringLabel']);
  });

  it('clicking a major key still just changes the key', () => {
    render(<CircleFace />);
    fireEvent.click(screen.getByRole('button', { name: 'G' }));
    expect(useStore.getState().note).toMatchObject({ selectedNote: 'G', selectedScale: 'Major (Ionian)' });
  });

  it('sharp minor keys keep their usual names (C#m, not Dbm)', () => {
    render(<CircleFace />);
    fireEvent.click(screen.getByRole('button', { name: 'C# minor' }));
    expect(useStore.getState().note.selectedNote).toBe('C#');
  });
});

it('the middle looks the same for every scale: one size for the name, small enough for the longest (Pentatonic)', () => {
  act(() => useStore.getState().setSelectedScale('Minor Pentatonic'));
  const { unmount } = render(<CircleFace />);
  const longName = screen.getByTestId('circle-scale');
  expect(longName).toHaveTextContent('Minor Pentatonic');
  const longClass = longName.className;
  unmount();
  act(() => useStore.getState().setSelectedScale('Dorian'));
  render(<CircleFace />);
  expect(screen.getByTestId('circle-scale').className).toBe(longClass);
  expect(screen.getByTestId('circle-scale')).not.toHaveAttribute('style');
  const css = require('fs').readFileSync(require('path').join(__dirname, 'Circle.module.css'), 'utf8') as string;
  expect(css).toMatch(/\.centerScale \{[^}]*font-size: min\(var\(--text-11\), [\d.]+cqw\)/);
});
