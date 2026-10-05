import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { buildDots } from './buildDots';
import { FretboardFace } from './FretboardFace';
import { FretboardSheet } from './FretboardSheet';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getCard } from '../registry';
import { activePick, pickFromFretboard } from './pickNote';

// Note playback goes to the sampled instruments; record what's played.
type Played = { guitar: number[]; piano: number[]; preload: string[] };
const played = (): Played => (globalThis as unknown as { mockPlayed: Played }).mockPlayed;
jest.mock('../../../audio/guitar', () => ({
  playGuitarNote: (m: number) => { (globalThis as any).mockPlayed.guitar.push(m); return Promise.resolve(); },
  preloadGuitar: () => { (globalThis as any).mockPlayed.preload.push('guitar'); return Promise.resolve(); },
}));
jest.mock('../../../audio/piano', () => ({
  playPianoNote: (m: number) => { (globalThis as any).mockPlayed.piano.push(m); return Promise.resolve(); },
  preloadPiano: () => { (globalThis as any).mockPlayed.preload.push('piano'); return Promise.resolve(); },
}));
beforeEach(() => { (globalThis as unknown as { mockPlayed: Played }).mockPlayed = { guitar: [], piano: [], preload: [] }; });

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

  it('with a chord showing, only its tones are drawn — plus the selected note, even outside the chord', () => {
    const chord = { root: 'A', pitches: [9, 0, 4] };   // A minor: A C E
    const show = { root: true, scale: true, selected: true };
    expect(buildDots({ ...base, chord, selected: 'B', show }).get('5-7')?.variant).toBe('current');   // B: not in the chord, still shown
    expect(buildDots({ ...base, chord, selected: 'C', show }).get('5-8')?.variant).toBe('current');   // C: a chord tone, selected color wins
    expect(buildDots({ ...base, chord, selected: 'A', show }).get('5-5')?.variant).toBe('root');      // the chord's root keeps the root color
    expect(buildDots({ ...base, chord, selected: 'B', show }).has('5-10')).toBe(false);              // D: neither
    expect(buildDots({ ...base, chord, selected: 'B', show: { ...show, selected: false } }).has('5-7')).toBe(false);
  });

  it('when the selected note is the root, the root color shows (not the selected color)', () => {
    const dots = buildDots({ ...base, selected: 'A', show: { root: true, scale: true, selected: true } });
    expect(dots.get('5-5')?.variant).toBe('root');                 // low E fret 5 = A, the root
    // With the root layer hidden, the selected highlight still shows it.
    expect(buildDots({ ...base, selected: 'A', show: { root: false, scale: true, selected: true } }).get('5-5')?.variant).toBe('current');
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

  it('works on open strings, and turns the Selected note layer on so the click shows (a chord stays)', () => {
    act(() => {
      useV2Store.getState().setCardPref('fretboard', 'showSelected', false);
      useStore.getState().setSelectedChord({ note: 'A', type: 'minor', symbol: 'm', roman: 'i' });
    });
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    click('E on string 1, fret 0');
    expect(useV2Store.getState().cardPrefs.fretboard.showSelected).toBe(true);
    expect(useStore.getState().note.selectedChord).not.toBeNull();
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

it('a chord (from the Chords card) doesn\'t affect the Selected note option', () => {
  act(() => useStore.getState().setSelectedChord({ note: 'A', type: 'minor', symbol: 'm', roman: 'i' }));
  render(<MemoryRouter><FretboardFace /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Selected note' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Selected note' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Stop showing chord Am' }));
  expect(useStore.getState().note.selectedChord).toBeNull();
});

describe('selecting and deselecting a note', () => {
  it('nothing is selected at first; click a note to select it, click it again to deselect', () => {
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    expect(useV2Store.getState().noteSelected).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'C on string 6, fret 8' }));
    expect(useV2Store.getState().noteSelected).toBe(true);
    expect(useStore.getState().note.currentNoteIndex).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'C on string 5, fret 3' }));   // the same note elsewhere: still C
    expect(useV2Store.getState().noteSelected).toBe(false);
  });

  it('an out-of-key note toggles too', () => {
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'A# on string 6, fret 6' }));
    expect(useV2Store.getState().noteSelected).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'A# on string 6, fret 6' }));
    expect(useV2Store.getState().noteSelected).toBe(false);
  });
});

it('the selected note and chord show as dismissible chips on the left of the bar (apart from the layer toggles)', () => {
  act(() => useStore.getState().setSelectedChord({ note: 'A', type: 'minor', symbol: 'm', roman: 'i' }));
  render(<MemoryRouter><FretboardFace /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: /Deselect note/ })).toBeNull();      // nothing selected yet
  fireEvent.click(screen.getByRole('button', { name: 'E on string 1, fret 0' }));
  const selection = screen.getByRole('group', { name: 'Selection' });
  expect(within(selection).getByRole('button', { name: 'Deselect note E' })).toHaveTextContent('Note: E');
  expect(within(selection).getByRole('button', { name: 'Stop showing chord Am' })).toBeInTheDocument();
  expect(within(selection).queryByRole('button', { name: 'Selected note' })).toBeNull();  // toggles live elsewhere
  fireEvent.click(within(selection).getByRole('button', { name: 'Deselect note E' }));
  expect(useV2Store.getState().noteSelected).toBe(false);
  expect(screen.queryByRole('button', { name: /Deselect note/ })).toBeNull();
});

it('dot labels use the names for the context (a built E♭ chord shows E♭, not D#)', () => {
  const dots = buildDots({ tuning: STD, frets: 12, root: 'C', scaleNotes: [], show: { root: true, scale: true, selected: false }, labels: 'notes',
    degreeOf: n => n, nameOf: n => (n === 'D#' ? 'Eb' : n), chord: { root: 'Eb', pitches: [3, 7, 10] } });
  expect(dots.get('4-6')?.label).toBe('Eb');   // A string fret 6 = D#/E♭
});

describe('play notes', () => {
  beforeEach(() => act(() => {
    useV2Store.setState(useV2Store.getInitialState(), true);
    useStore.getState().setTuning(STD);
    useStore.getState().setViewMode('fretboard');
  }));

  it('off by default; when on, clicking the neck plays that note on guitar', () => {
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    const toggle = screen.getByRole('button', { name: 'Play notes' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'C on string 5, fret 3' }));
    expect(played().guitar).toEqual([]);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(played().preload).toContain('guitar');
    fireEvent.click(screen.getByRole('button', { name: 'C on string 5, fret 3' }));   // C3
    fireEvent.click(screen.getByRole('button', { name: 'E on string 1, fret 0' }));   // E4
    expect(played().guitar).toEqual([48, 64]);
    expect(useV2Store.getState().cardPrefs.fretboard.playNotes).toBe(true);
  });

  it('clicking the selected note again (deselecting it) still plays it', () => {
    act(() => useV2Store.getState().setCardPref('fretboard', 'playNotes', true));
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'C on string 5, fret 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'C on string 5, fret 3' }));
    expect(played().guitar).toEqual([48, 48]);
  });

  it('in piano view, keys play on piano', () => {
    act(() => useV2Store.getState().setCardPref('fretboard', 'playNotes', true));
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
    expect(played().preload).toContain('piano');
    fireEvent.click(screen.getByRole('button', { name: 'C4' }));
    expect(played().piano).toEqual([60]);
    expect(played().guitar).toEqual([]);
  });
});

describe('play notes with the Selected note layer off', () => {
  beforeEach(() => act(() => {
    useV2Store.setState(useV2Store.getInitialState(), true);
    useStore.getState().setTuning(STD);
    useStore.getState().setViewMode('fretboard');
    useV2Store.getState().setCardPref('fretboard', 'playNotes', true);
    useV2Store.getState().setCardPref('fretboard', 'showSelected', false);
  }));

  it('just plays: nothing gets selected and the layer stays off', () => {
    const before = { index: useStore.getState().note.currentNoteIndex, picked: useV2Store.getState().pickedNote, selected: useV2Store.getState().noteSelected };
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'C on string 5, fret 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'A# on string 6, fret 6' }));
    expect(played().guitar).toEqual([48, 46]);
    expect(useV2Store.getState().cardPrefs.fretboard.showSelected).toBe(false);
    expect(screen.getByRole('button', { name: 'Selected note' })).toHaveAttribute('aria-pressed', 'false');
    expect(useStore.getState().note.currentNoteIndex).toBe(before.index);
    expect(useV2Store.getState().pickedNote).toEqual(before.picked);
    expect(useV2Store.getState().noteSelected).toBe(before.selected);
  });
});

describe('piano view is independent of the guitar tuning', () => {
  const keyNames = () => screen.getAllByRole('button').map(b => b.getAttribute('aria-label') ?? '').filter(l => /^[A-G]#?\d$/.test(l));
  beforeEach(() => act(() => {
    useV2Store.setState(useV2Store.getInitialState(), true);
    useStore.getState().setViewMode('piano');
    useStore.getState().setSelectedNote('C');
    useStore.getState().setSelectedScale('Major (Ionian)');
  }));

  it('always shows the same keys, C2 to B5, whatever the tuning or frets', () => {
    act(() => useStore.getState().setTuning(STD));
    const { unmount } = render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    const standard = keyNames();
    expect(standard).toEqual(expect.arrayContaining(['C2', 'B5']));
    expect(standard).not.toEqual(expect.arrayContaining(['B1']));
    expect(standard).not.toEqual(expect.arrayContaining(['C6']));
    expect(standard).toHaveLength(48);
    unmount();
    act(() => { useStore.getState().setTuning(['D', 'A', 'G', 'D', 'A', 'D']); useV2Store.getState().setCardPref('fretboard', 'frets', 12); });
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    expect(keyNames()).toEqual(standard);
  });

  it('every key gets its dot from the key and scale — even ones a guitar cannot reach', () => {
    act(() => useStore.getState().setTuning(STD));
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'C2' })).toHaveClass('variant-root');   // below the low E
    expect(screen.getByRole('button', { name: 'D2' })).toHaveClass('variant-scale');
    expect(screen.getByRole('button', { name: 'C#2' })).not.toHaveClass('variant-scale');
  });

  it('every key is playable, at its own pitch', () => {
    act(() => { useStore.getState().setTuning(STD); useV2Store.getState().setCardPref('fretboard', 'playNotes', true); });
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'C2' }));
    fireEvent.click(screen.getByRole('button', { name: 'B5' }));
    expect(played().piano).toEqual([36, 83]);
  });
});

describe('ripple when a note plays', () => {
  beforeEach(() => act(() => {
    useV2Store.setState(useV2Store.getInitialState(), true);
    useStore.getState().setTuning(STD);
    useStore.getState().setViewMode('fretboard');
  }));

  it('a circle spreads out from the centre of the note you played, then goes away', () => {
    act(() => useV2Store.getState().setCardPref('fretboard', 'playNotes', true));
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    const cell = screen.getByRole('button', { name: 'C on string 5, fret 3' });
    fireEvent.pointerDown(cell);
    fireEvent.click(cell);
    const ripple = screen.getByTestId('note-ripple');
    // (jsdom has no layout; in a browser this is the centre of the fret or key.)
    expect(ripple.style.left).toMatch(/^-?\d+(\.\d+)?px$/);
    expect(ripple.style.top).toMatch(/^-?\d+(\.\d+)?px$/);
    // The note itself flashes grey (a dot-sized circle on the fretboard).
    expect(screen.getByTestId('note-flash')).toHaveClass('flashDot');
    fireEvent.animationEnd(ripple);
    expect(screen.queryByTestId('note-ripple')).toBeNull();
    expect(screen.queryByTestId('note-flash')).toBeNull();
  });

  it('not on piano keys (they play without a ripple or flash)', () => {
    act(() => { useV2Store.getState().setCardPref('fretboard', 'playNotes', true); useStore.getState().setViewMode('piano'); });
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'C4' }));
    fireEvent.click(screen.getByRole('button', { name: 'C4' }));
    expect(played().piano).toEqual([60]);
    expect(screen.queryByTestId('note-ripple')).toBeNull();
    expect(screen.queryByTestId('note-flash')).toBeNull();
  });

  it('only when Play notes is on, and never for clicks off the notes', () => {
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'C on string 5, fret 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'C on string 5, fret 3' }));
    expect(screen.queryByTestId('note-ripple')).toBeNull();
  });

  it('the flash shows the note (or its interval) — so notes without a dot show what you played', () => {
    act(() => {
      useV2Store.getState().setCardPref('fretboard', 'playNotes', true);
      useStore.getState().setSelectedNote('C');
      useStore.getState().setSelectedScale('Major (Ionian)');
    });
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    const outOfKey = screen.getByRole('button', { name: /^(C#|Db) on string 5, fret 4$/ });
    fireEvent.pointerDown(outOfKey);
    fireEvent.click(outOfKey);
    expect(screen.getByTestId('note-flash')).toHaveTextContent(/^(C#|Db)$/);
    fireEvent.animationEnd(screen.getByTestId('note-ripple'));
    fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));
    const e = screen.getByRole('button', { name: 'E on string 5, fret 7' });
    fireEvent.pointerDown(e);
    fireEvent.click(e);
    expect(screen.getByTestId('note-flash')).toHaveTextContent('3');
  });

  it('respects reduced motion', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, 'FretboardCard.module.css'), 'utf8') as string;
    expect(css).toMatch(/prefers-reduced-motion[^{]*\{[^}]*\.ripple/);
  });
});

describe('hover', () => {
  beforeEach(() => act(() => {
    useV2Store.setState(useV2Store.getInitialState(), true);
    useStore.getState().setTuning(STD);
    useStore.getState().setViewMode('fretboard');
    useStore.getState().setSelectedNote('C');
    useStore.getState().setSelectedScale('Major (Ionian)');
  }));
  const cellOf = (name: RegExp | string) => within(screen.getByRole('button', { name })).getByTestId('fret-dot');

  it('an empty fret previews its note in grey (name, or interval when Intervals is on)', () => {
    render(<MemoryRouter><FretboardFace /></MemoryRouter>);
    const empty = cellOf(/^(C#|Db) on string 5, fret 4$/);
    expect(empty).toHaveClass('clickable-empty');
    expect(screen.getByTestId('fretboard')).toHaveClass('full-preview');
    expect(empty).toHaveTextContent(/^(C#|Db)$/);
    fireEvent.click(screen.getByRole('button', { name: 'Intervals' }));
    expect(cellOf(/^(C#|Db) on string 5, fret 4$/)).toHaveTextContent('♭2');
  });

  it('a dot\'s own border turns white on hover (a ring exactly its size); the ghost fades in and out', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, '../../../components/Fretboard/Fretboard.css'), 'utf8') as string;
    expect(css).toMatch(/\.fretboard-cell-hit:hover \.fretboard-cell\.variant-root[^{]*\{[^}]*border-color:/);
    expect(css).toMatch(/\.fretboard-ghost-label\s*\{[^}]*opacity:\s*0/);
    // On the Fretboard card the preview is as big as a regular dot.
    expect(css).toMatch(/\.full-preview \.fretboard-cell-hit:hover \.fretboard-cell\.clickable-empty\s*\{[^}]*width:\s*26px/);
  });
});
