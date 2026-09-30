import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { HarmonyFace } from './HarmonyFace';
import { HarmonySheet } from './HarmonySheet';
import { lockToHorizontal, swapForDrop } from './OrderStrip';
import { resolvePairs } from './harmonyModel';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { generateFretboard } from '../../../data/guitarData';
import { getCard } from '../registry';

// Playback uses the audio clock and guitar samples; jsdom has neither.
type Played = Array<{ midi: number; time?: number }>;
jest.mock('../../../audio/engine', () => ({ getAudioContext: () => ({ currentTime: 0 }) }));
jest.mock('../../../audio/guitar', () => ({
  preloadGuitar: () => Promise.resolve(),
  playGuitarNote: (midi: number, _d: number, time?: number) => {
    const g = globalThis as unknown as { mockPlayed?: Played };
    (g.mockPlayed ??= []).push({ midi, time });
    return Promise.resolve();
  },
}));

const hm = () => useStore.getState().harmonyMaker;
const cell = (name: string) => screen.getByRole('button', { name });
const pair = () => resolvePairs(hm().notes, 'C', 'Major (Ionian)', generateFretboard(useStore.getState().note.tuning, 12), 12, useStore.getState().note.tuning)[0];

beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  const st = useStore.getState();
  st.setTuning(['E', 'B', 'G', 'D', 'A', 'E']);
  st.setSelectedNote('C'); st.setSelectedScale('Major (Ionian)');
  st.clearHarmonyMaker(); st.setDefaultInterval({ kind: 'diatonic', degrees: 2 });
}));

it('is a full-width card', () => {
  expect(getCard('harmony')).toMatchObject({ title: 'Harmony', size: { colSpan: 12 } });
});

it('click a fret to add your note — no harmony yet, so it can\'t land where the next note goes; click it again to remove', () => {
  render(<HarmonyFace />);
  fireEvent.click(cell('C on string 5, fret 3'));
  expect(hm().notes).toHaveLength(1);
  expect(pair().selected).toBeNull();
  expect(within(screen.getByRole('list', { name: 'Order' })).getByText('C')).toBeInTheDocument();
  fireEvent.click(cell('C on string 5, fret 3'));
  expect(hm().notes).toHaveLength(0);
});

it('Apply gives every note its harmony (a 3rd above in the key); notes added after wait for the next Apply', () => {
  render(<HarmonyFace />);
  fireEvent.click(cell('C on string 5, fret 3'));
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(pair().selected?.note).toBe('E');
  fireEvent.click(cell('D on string 5, fret 5'));
  expect(hm().notes.map(n => !!n.harmonized)).toEqual([true, false]);
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(hm().notes.map(n => !!n.harmonized)).toEqual([true, true]);
});

it('click a harmony to choose another spot for it, then click the spot', () => {
  act(() => { useStore.getState().addBaseNote({ stringIndex: 4, fret: 3 }); useStore.getState().applyDefaultToAll(); });
  render(<HarmonyFace />);
  const p = pair();
  const alt = p.voicings.find((_, i) => i !== p.selectedIdx)!;
  fireEvent.click(cell(`${p.selected!.note} on string ${p.selected!.stringIndex + 1}, fret ${p.selected!.fret}`));
  expect(screen.getByText(/Pick a spot for harmony 1/)).toBeInTheDocument();
  fireEvent.click(cell(`${alt.note} on string ${alt.stringIndex + 1}, fret ${alt.fret}`));
  expect(hm().notes[0].harmonyAt).toEqual({ stringIndex: alt.stringIndex, fret: alt.fret });
  expect(screen.queryByText(/Pick a spot for harmony 1/)).toBeNull();
});

it('the Order strip is just the play order: number and note; drop a chip on another to swap them', () => {
  act(() => { useStore.getState().addBaseNote({ stringIndex: 4, fret: 3 }); useStore.getState().addBaseNote({ stringIndex: 4, fret: 5 }); });
  render(<HarmonyFace />);
  const items = within(screen.getByRole('list', { name: 'Order' })).getAllByRole('listitem');
  expect(items.map(li => li.textContent)).toEqual(['1C', '2D']);
  expect(within(items[0]).getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual(['Note 1, C — drag onto another note to swap']);
  expect(within(items[0]).queryByRole('combobox')).toBeNull();
});

it('the top bar sets the interval for new notes, applies it to all (confirming overrides), and clears', () => {
  act(() => { useStore.getState().addBaseNote({ stringIndex: 4, fret: 3 }); useStore.getState().setNoteInterval(4, 3, { kind: 'diatonic', degrees: 5 }); });
  render(<HarmonyFace />);
  fireEvent.click(screen.getByRole('radio', { name: '5th' }));
  expect(hm().defaultInterval).toEqual({ kind: 'diatonic', degrees: 4 });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
  expect(confirm).toHaveBeenCalled();
  expect(hm().notes[0].interval).toEqual({ kind: 'diatonic', degrees: 4 });
  confirm.mockRestore();
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(hm().notes).toHaveLength(0);
});

it('sheet: dot labels (play order by default, or note names), key notes, frets', () => {
  render(<HarmonySheet />);
  expect(screen.getByRole('radio', { name: 'Play order' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('radio', { name: 'Note names' }));
  expect(useV2Store.getState().cardPrefs.harmony.labels).toBe('notes');
  // On by default: the key's notes sit faintly underneath.
  expect(screen.getByRole('switch', { name: 'Show notes in the key' })).toBeChecked();
  fireEvent.click(screen.getByRole('switch', { name: 'Show notes in the key' }));
  expect(useV2Store.getState().cardPrefs.harmony.showKey).toBe(false);
  fireEvent.click(screen.getByRole('radio', { name: '24' }));
  expect(useV2Store.getState().cardPrefs.harmony.frets).toBe(24);
});

describe('drag to move (like the old Harmony card)', () => {
  const dt = { dataTransfer: { setData: () => {}, getData: () => '', effectAllowed: '', dropEffect: '' } };
  beforeEach(() => act(() => { useStore.getState().addBaseNote({ stringIndex: 4, fret: 3 }); useStore.getState().applyDefaultToAll(); }));

  it('drag your note onto the same note elsewhere to move it (its harmony follows)', () => {
    render(<HarmonyFace />);
    fireEvent.dragStart(within(cell('C on string 5, fret 3')).getByText('1'), dt);
    fireEvent.drop(cell('C on string 6, fret 8'), dt);
    expect(hm().notes).toEqual([expect.objectContaining({ stringIndex: 5, fret: 8 })]);
  });

  it('drag your note onto another of your notes to swap their order', () => {
    act(() => useStore.getState().addBaseNote({ stringIndex: 4, fret: 5 }));
    render(<HarmonyFace />);
    fireEvent.dragStart(within(cell('C on string 5, fret 3')).getByText('1'), dt);
    fireEvent.drop(cell('D on string 5, fret 5'), dt);
    expect(hm().notes.map(n => n.fret)).toEqual([5, 3]);
  });

  it('drag a harmony to see its other spots; dropping snaps to the nearest one', () => {
    render(<HarmonyFace />);
    const p = pair();
    const alt = p.voicings.find((_, i) => i !== p.selectedIdx)!;
    const h = p.selected!;
    fireEvent.dragStart(within(cell(`${h.note} on string ${h.stringIndex + 1}, fret ${h.fret}`)).getByText('1'), dt);
    expect(screen.getByText(/Drop harmony 1 on one of its spots/)).toBeInTheDocument();
    fireEvent.drop(cell(`${alt.note} on string ${alt.stringIndex + 1}, fret ${alt.fret}`), dt);
    expect(hm().notes[0].harmonyAt).toEqual({ stringIndex: alt.stringIndex, fret: alt.fret });
  });
});

it('Order chips drag left and right only', () => {
  const t = lockToHorizontal({ transform: { x: 40, y: 25, scaleX: 1, scaleY: 1 } } as Parameters<typeof lockToHorizontal>[0]);
  expect(t).toEqual({ x: 40, y: 0, scaleX: 1, scaleY: 1 });
});

it('the legend is just Melody and Harmony, in the same colors as the dots', () => {
  render(<HarmonyFace />);
  const legend = screen.getByTestId('harmony-legend');
  expect(legend).toHaveTextContent(/^MelodyHarmony$/);
  const read = (p: string) => require('fs').readFileSync(require('path').join(__dirname, p), 'utf8') as string;
  const css = read('Harmony.module.css');
  const board = read('../../../components/Fretboard/Fretboard.css');
  // The fretboard draws harmony dots with --ds-color-warning and your notes with --ds-color-primary.
  expect(board).toMatch(/harmony[\s\S]*?var\(--ds-color-warning\)/);
  expect(css).toMatch(/\.swHarm \{ background: var\(--ds-color-warning\); \}/);
  expect(css).toMatch(/\.swBase \{ background: var\(--ds-color-primary\); \}/);
});

it('Play plays the pairs in order as quarter notes at the tempo, highlighting each; Stop stops', () => {
  jest.useFakeTimers();
  (globalThis as unknown as { mockPlayed?: Played }).mockPlayed = [];
  act(() => { useStore.getState().setBpm(120); useStore.getState().addBaseNote({ stringIndex: 4, fret: 3 }); useStore.getState().addBaseNote({ stringIndex: 4, fret: 5 }); useStore.getState().applyDefaultToAll(); });
  render(<HarmonyFace />);
  fireEvent.click(screen.getByRole('button', { name: 'Play harmony' }));
  act(() => { jest.advanceTimersByTime(150); });
  // C3 (48) with its harmony E3 (52) together first.
  const played = () => (globalThis as unknown as { mockPlayed: Played }).mockPlayed;
  expect(played().slice(0, 2).map(p => p.midi).sort()).toEqual([48, 52]);
  expect(within(screen.getByRole('list', { name: 'Order' })).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
  fireEvent.click(screen.getByRole('button', { name: 'Stop harmony' }));
  act(() => { jest.advanceTimersByTime(5000); });
  expect(played()).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Play harmony' })).toBeInTheDocument();
  jest.useRealTimers();
});

it('dropping a chip on another chip swaps those two', () => {
  expect(swapForDrop(['a', 'b', 'c'], 'a', 'c')).toEqual([0, 2]);
  expect(swapForDrop(['a', 'b', 'c'], 'b', 'b')).toBeNull();
  expect(swapForDrop(['a', 'b', 'c'], 'b', null)).toBeNull();
});
