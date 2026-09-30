import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { buildDots } from './buildDots';
import { FretboardFace } from './FretboardFace';
import { FretboardSheet } from './FretboardSheet';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getCard } from '../registry';
import { activePick, pickFromFretboard } from './pickNote';

const STD = ['E', 'B', 'G', 'D', 'A', 'E'];

describe('buildDots', () => {
  const base = { tuning: STD, frets: 12, root: 'A', scaleNotes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    show: { root: true, scale: true }, labels: 'notes' as const, degreeOf: (n: string) => n };

  it('highlights the selected note (from the Scale card) above root and scale when shown', () => {
    const dots = buildDots({ ...base, selected: 'C', show: { root: true, scale: true, selected: true } });
    expect(dots.get('5-8')?.variant).toBe('current');  // fret 8 = C, the selected note
    expect(dots.get('5-5')?.variant).toBe('root');
    expect(buildDots({ ...base, selected: 'C', show: { root: true, scale: true, selected: false } }).get('5-8')?.variant).toBe('scale');
  });

  it('marks the root over scale tones, and skips notes outside the scale', () => {
    const dots = buildDots(base);
    expect(dots.get('5-5')?.variant).toBe('root');      // low E string, fret 5 = A
    expect(dots.get('5-8')?.variant).toBe('scale');     // fret 8 = C — just a scale tone
    expect(dots.get('5-7')?.variant).toBe('scale');     // fret 7 = B
    expect(dots.has('5-6')).toBe(false);                // A# not in A minor
  });

  it('respects the show toggles and label mode', () => {
    const dots = buildDots({ ...base, show: { root: false, scale: true }, labels: 'intervals', degreeOf: () => 'x' });
    expect(dots.get('5-5')?.variant).toBe('scale');
    expect(dots.get('5-5')?.label).toBe('x');
    expect(buildDots({ ...base, labels: 'none' }).get('5-5')?.label).toBe('');
  });
});

beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  useStore.getState().setViewMode('fretboard');
  useStore.getState().setSelectedNote('A');
  useStore.getState().setSelectedScale('Aeolian (Natural Minor)');
}));

it('is registered full width and tall', () => {
  expect(getCard('fretboard')?.size.colSpan).toBe(12);
  expect(getCard('fretboard')!.size.rowSpan).toBeGreaterThanOrEqual(8);
});

it('face switches Fretboard/Piano and toggles dot layers (persisted)', () => {
  render(<MemoryRouter><FretboardFace /></MemoryRouter>);
  fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
  expect(useStore.getState().viewMode).toBe('piano');
  fireEvent.click(screen.getByRole('button', { name: /Scale/ }));
  expect(useV2Store.getState().cardPrefs.fretboard.showScale).toBe(false);
  expect(screen.queryAllByRole('link')).toHaveLength(0);
});

it('has a plain "Selected note" on/off toggle (no note name in the tag), persisted', () => {
  render(<MemoryRouter><FretboardFace /></MemoryRouter>);
  const toggle = screen.getByRole('button', { name: 'Selected note' });
  expect(toggle).toHaveTextContent(/^Selected note$/);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(toggle);
  expect(useV2Store.getState().cardPrefs.fretboard.showSelected).toBe(false);
});

it('sheet sets frets and dot labels', () => {
  render(<MemoryRouter><FretboardSheet /></MemoryRouter>);
  fireEvent.click(screen.getByRole('radio', { name: '15' }));
  expect(useV2Store.getState().cardPrefs.fretboard.frets).toBe(15);
  fireEvent.click(screen.getByRole('radio', { name: 'Intervals' }));
  expect(useV2Store.getState().cardPrefs.fretboard.labels).toBe('intervals');
  expect(screen.getByRole('button', { name: 'Lower string 6 (E)' })).toBeInTheDocument();
});

it('sheet also holds every face option: view and the Root/Scale/Selected note layers', () => {
  render(<MemoryRouter><FretboardSheet /></MemoryRouter>);
  fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
  expect(useStore.getState().viewMode).toBe('piano');
  fireEvent.click(screen.getByRole('switch', { name: 'Show root' }));
  expect(useV2Store.getState().cardPrefs.fretboard.showRoot).toBe(false);
  fireEvent.click(screen.getByRole('switch', { name: 'Show scale' }));
  expect(useV2Store.getState().cardPrefs.fretboard.showScale).toBe(false);
  fireEvent.click(screen.getByRole('switch', { name: 'Show selected note' }));
  expect(useV2Store.getState().cardPrefs.fretboard.showSelected).toBe(false);
});

describe('clicking a note selects it', () => {
  const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

  it('an in-scale note moves the shared scale position there (the Scale card follows)', () => {
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    click('C on string 6, fret 8');
    expect(useStore.getState().note.currentNoteIndex).toBe(2); // A B C…
    expect(useV2Store.getState().pickedNote).toBeNull();
  });

  it('an out-of-key note becomes the selected note too', () => {
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    click('A# on string 6, fret 6');
    expect(useV2Store.getState().pickedNote).toMatchObject({ note: 'A#' });
  });

  it('works on open strings, and turns the Selected note layer on (clearing a chord) so the click shows', () => {
    act(() => {
      useV2Store.getState().setCardPref('fretboard', 'showSelected', false);
      useStore.getState().setSelectedChord({ note: 'A', type: 'minor', symbol: 'm', roman: 'i' });
    });
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    click('E on string 1, fret 0');
    expect(useV2Store.getState().cardPrefs.fretboard.showSelected).toBe(true);
    expect(useStore.getState().note.selectedChord).toBeNull();
    expect(useStore.getState().note.currentNoteIndex).toBe(4);
  });
});

describe('pickNote', () => {
  const scaleNotes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const ctx = { root: 'A', scale: 'Aeolian (Natural Minor)', index: 3 };

  it('maps a click to a scale position, or an out-of-key pick', () => {
    expect(pickFromFretboard('C', scaleNotes, ctx)).toEqual({ index: 2, pick: null });
    expect(pickFromFretboard('Bb', scaleNotes, ctx)).toEqual({ index: null, pick: { note: 'Bb', ...ctx } });
  });

  it('an out-of-key pick lasts until the scale position, key or scale changes', () => {
    const pick = { note: 'Bb', ...ctx };
    expect(activePick(pick, ctx)).toBe('Bb');
    expect(activePick(pick, { ...ctx, index: 4 })).toBeNull();
    expect(activePick(pick, { ...ctx, root: 'C' })).toBeNull();
    expect(activePick(pick, { ...ctx, scale: 'Dorian' })).toBeNull();
    expect(activePick(null, ctx)).toBeNull();
  });
});
