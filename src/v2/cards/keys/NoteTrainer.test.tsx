import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { KeysFace } from './KeysFace';
import { KeysSheet } from './KeysSheet';
import { nextKey, shouldAdvance, markPlayed, nextFromHat } from './keyCycle';
import { useShuffleBag } from './shuffleBag';
import { chromaticPosition } from '../../music/intervals';
import { useStore } from '../../../store/useStore';
import { useTransport } from '../../../audio';
import { getCard } from '../registry';
import { useV2Store, V2_STORAGE_KEY } from '../../state/useV2Store';

const c = () => useStore.getState().circleOfFifths;
beforeEach(() => act(() => {
  const st = useStore.getState();
  st.setSelectedNote('C'); st.setCircleAutoAdvance(false); st.setCircleDirection('clockwise'); st.setCircleRandomize(false);
  st.setCircleChangeMode('beats'); st.setCircleChangeInterval(4); st.setCircleCountIn(4); st.setCircleShowNext(true);
  st.setMetronomePlaying(false);
}));

describe('keyCycle', () => {
  it('steps around the circle of fifths, fourths, or randomly (never the same key)', () => {
    expect(nextKey('C', 'clockwise', false)).toBe('G');
    expect(nextKey('C', 'counterclockwise', false)).toBe('F');
    for (let i = 0; i < 20; i++) expect(nextKey('C', 'clockwise', true)).not.toBe('C');
  });

  const walk = (direction: 'clockwise' | 'counterclockwise', accidental: 'sharp' | 'flat') => {
    const keys = ['C'];
    for (let i = 0; i < 11; i++) keys.push(nextKey(keys[keys.length - 1], direction, false, accidental));
    return keys;
  };

  it('spells black keys with sharps or flats, as chosen', () => {
    expect(walk('clockwise', 'sharp')).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F']);
    expect(walk('counterclockwise', 'flat')).toEqual(['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G']);
    const random = new Set<string>();
    for (let i = 0; i < 300; i++) { random.add(nextKey('C', 'clockwise', true, 'flat')); random.add(nextFromHat('C', [], 'flat')); }
    expect(Array.from(random).some(n => n.includes('#'))).toBe(false);
    expect(random).toContain('Gb');
  });

  it('advances on the right beats and bars', () => {
    const beat = (beatCount: number, barIndex = 0, beatInBar = 0) => ({ beatCount, barIndex, beatInBar });
    expect(shouldAdvance('beats', beat(8), 4, 4)).toBe(true);    // 4 beats after a 4-beat count-in
    expect(shouldAdvance('beats', beat(4), 4, 4)).toBe(false);   // count-in just finished
    expect(shouldAdvance('bars', beat(8, 2, 0), 2, 4)).toBe(true);
    expect(shouldAdvance('bars', beat(9, 2, 1), 2, 4)).toBe(false);
    expect(shouldAdvance('time', beat(8), 4, 4)).toBe(false);
  });
});

it('is a small card called Note Trainer', () => {
  expect(getCard('note-trainer')).toMatchObject({ title: 'Note Trainer', size: { colSpan: 3, rowSpan: 6 } });
});

it('face: on/off, current → next, and the order', () => {
  render(<KeysFace />);
  expect(screen.getByTestId('hero-value')).toHaveTextContent('C→G');
  fireEvent.click(screen.getByRole('switch', { name: 'Auto-change' }));
  expect(c().autoAdvance).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: '← Fourths' }));
  expect(c().direction).toBe('counterclockwise');
  fireEvent.click(screen.getByRole('radio', { name: 'Random' }));
  expect(c().randomize).toBe(true);
});

it('face counts down the count-in and the next change from the shared metronome', () => {
  act(() => { useStore.getState().setCircleAutoAdvance(true); useStore.getState().setMetronomePlaying(true); });
  act(() => useTransport.setState({ running: true, beatCount: 1, barIndex: 0, beatInBar: 1, beatsPerBar: 4 }));
  render(<KeysFace />);
  expect(screen.getByText(/count-in 3/i)).toBeInTheDocument();
  act(() => useTransport.setState({ beatCount: 5, barIndex: 1, beatInBar: 1 }));
  expect(screen.getByText(/next in 3 beats/i)).toBeInTheDocument();
  act(() => { useTransport.setState({ running: false, beatCount: -1 }); useStore.getState().setMetronomePlaying(false); });
});

it('sheet holds every setting', () => {
  render(<KeysSheet />);
  fireEvent.click(screen.getByRole('radio', { name: 'Bars' }));
  expect(c().changeMode).toBe('bars');
  fireEvent.click(screen.getByRole('button', { name: 'Increase change every by 1' }));
  expect(c().changeInterval).toBe(5);
  fireEvent.click(screen.getByRole('radio', { name: '8' }));
  expect(c().countIn).toBe(8);
  fireEvent.click(screen.getByRole('switch', { name: 'Show next key' }));
  expect(c().showNext).toBe(false);
});

describe('presets', () => {
  beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

  it('the face offers the built-in presets as one-tap chips, marking the one in use', () => {
    render(<KeysFace />);
    fireEvent.click(screen.getByRole('button', { name: '8 beats' }));
    expect(c()).toMatchObject({ changeMode: 'beats', changeInterval: 8 });
    expect(screen.getByRole('button', { name: '8 beats' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '11 beats' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: '6 beats' }));
    expect(c().changeInterval).toBe(6);
  });

  it('the sheet saves the current setting as a preset (kept in the browser), which then shows on the card', () => {
    act(() => { useStore.getState().setCircleChangeMode('bars'); useStore.getState().setCircleChangeInterval(2); });
    render(<><KeysSheet /><KeysFace /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Save 2 bars as a preset' }));
    expect(screen.getByRole('button', { name: 'Save 2 bars as a preset' })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(V2_STORAGE_KEY)!).state.changePresets.at(-1))
      .toEqual({ mode: 'bars', interval: 2 });
    act(() => useStore.getState().setCircleChangeInterval(4));
    fireEvent.click(screen.getByRole('button', { name: '2 bars' }));
    expect(c().changeInterval).toBe(2);
  });

  it('every preset, defaults included, can be edited and removed in the sheet', () => {
    render(<><KeysSheet /><KeysFace /></>);
    fireEvent.click(screen.getByRole('button', { name: 'Increase preset 1 by 1' }));
    expect(screen.getByRole('button', { name: '12 beats' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '11 beats' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove preset 8 beats' }));
    expect(screen.queryByRole('button', { name: '8 beats' })).toBeNull();
    expect(useV2Store.getState().changePresets).toEqual([{ mode: 'beats', interval: 12 }, { mode: 'beats', interval: 6 }]);
  });
});

describe('shuffle: every key once before repeating', () => {
  it('marks keys as played by pitch, and starts a new round after all 12', () => {
    expect(markPlayed([], 'C')).toEqual(['C']);
    expect(markPlayed(['C'], 'C')).toEqual(['C']);
    expect(markPlayed(['C'], 'Gb')).toEqual(['C', 'Gb']);
    const all = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    expect(markPlayed(all, 'G')).toEqual(['G']);
  });

  it('draws only keys not yet played; once the hat is empty, any other key', () => {
    const played = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb'];
    for (let i = 0; i < 10; i++) expect(nextFromHat('Bb', played)).toBe('F');
    const all = [...played, 'F'];
    for (let i = 0; i < 20; i++) expect(nextFromHat('F', all)).not.toBe('F');
  });

  it('the card plays all 12 keys before any repeats (on by default in Random)', () => {
    act(() => { useShuffleBag.getState().reset(); useV2Store.setState(useV2Store.getInitialState(), true); useStore.getState().setCircleRandomize(true); });
    render(<KeysFace />);
    const seen = [chromaticPosition(useStore.getState().note.selectedNote!)];
    for (let i = 0; i < 11; i++) {
      act(() => useStore.getState().setSelectedNote(c().nextNote!));
      seen.push(chromaticPosition(useStore.getState().note.selectedNote!));
    }
    expect(new Set(seen).size).toBe(12);
    expect(screen.getByText('12 of 12 played')).toBeInTheDocument();
    act(() => useStore.getState().setSelectedNote(c().nextNote!));
    expect(screen.getByText('1 of 12 played')).toBeInTheDocument();
  });

  it('the sheet can turn it off and start a new round', () => {
    act(() => { useShuffleBag.getState().reset(); useV2Store.setState(useV2Store.getInitialState(), true); useStore.getState().setCircleRandomize(true); });
    render(<><KeysSheet /><KeysFace /></>);
    act(() => useStore.getState().setSelectedNote(c().nextNote!));
    expect(screen.getByText('2 of 12 played')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new round' }));
    expect(screen.getByText('1 of 12 played')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Play all 12 before repeating' }));
    expect(screen.queryByText(/of 12 played/)).toBeNull();
  });
});

describe('choosing the note on the card', () => {
  it('tap the note to pick another — no Scale card needed', () => {
    render(<KeysFace />);
    fireEvent.click(screen.getByRole('button', { name: 'Change note (C)' }));
    const picker = screen.getByRole('radiogroup', { name: 'Note' });
    // Spelled with sharps by default (the ♯ / ♭ switch changes it).
    expect(within(picker).getAllByRole('radio').map(r => r.textContent)).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
    fireEvent.click(within(picker).getByRole('radio', { name: 'E' }));
    expect(useStore.getState().note.selectedNote).toBe('E');
    expect(screen.queryByRole('radiogroup', { name: 'Note' })).toBeNull();
  });

  it('Escape closes the picker without changing the note', () => {
    render(<KeysFace />);
    fireEvent.click(screen.getByRole('button', { name: 'Change note (C)' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('radiogroup', { name: 'Note' })).toBeNull();
    expect(useStore.getState().note.selectedNote).toBe('C');
  });

  it('the sheet has the current note too', () => {
    render(<KeysSheet />);
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Current note' })).getByRole('radio', { name: 'Bb' }));
    expect(useStore.getState().note.selectedNote).toBe('Bb');
  });
});

describe('sharps or flats', () => {
  const pref = () => useV2Store.getState().cardPrefs['note-trainer']?.accidentals;
  const openPicker = () => fireEvent.click(screen.getByRole('button', { name: /^Change note/ }));

  it('the note picker has a ♯ / ♭ switch that respells the notes and the current one', () => {
    act(() => useStore.getState().setSelectedNote('F#'));
    render(<KeysFace />);
    openPicker();
    const spelling = screen.getByRole('radiogroup', { name: 'Spelling' });
    expect(within(spelling).getByRole('radio', { name: 'Sharps' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'C#' })).toBeInTheDocument();
    fireEvent.click(within(spelling).getByRole('radio', { name: 'Flats' }));
    expect(pref()).toBe('flat');
    expect(screen.getByRole('radio', { name: 'Db' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'C#' })).toBeNull();
    expect(useStore.getState().note.selectedNote).toBe('Gb');
  });

  it('fifths switch it to sharps, fourths to flats; random keeps the last choice', () => {
    act(() => useStore.getState().setSelectedNote('Db'));
    render(<KeysFace />);
    fireEvent.click(screen.getByRole('radio', { name: '← Fourths' }));
    expect(pref()).toBe('flat');
    fireEvent.click(screen.getByRole('radio', { name: 'Fifths →' }));
    expect(pref()).toBe('sharp');
    expect(useStore.getState().note.selectedNote).toBe('C#');
    fireEvent.click(screen.getByRole('radio', { name: 'Random' }));
    expect(pref()).toBe('sharp');
  });

  it('the note picker covers the whole card (nothing shows through)', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, 'NoteTrainer.module.css'), 'utf8') as string;
    expect(css).toMatch(/\.wrap\s*\{[^}]*min-height:\s*100%/);
  });
});

it('the note picker has a small Back button: close it (e.g. after changing ♯ / ♭) without picking', () => {
  act(() => useStore.getState().setSelectedNote('F#'));
  render(<KeysFace />);
  fireEvent.click(screen.getByRole('button', { name: /^Change note/ }));
  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Spelling' })).getByRole('radio', { name: 'Flats' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.queryByRole('radiogroup', { name: 'Note' })).toBeNull();
  expect(useStore.getState().note.selectedNote).toBe('Gb');
});
