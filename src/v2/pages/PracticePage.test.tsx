import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PracticePage } from './PracticePage';
import { CardSheetHost } from '../cards/CardSheetHost';
import { ToastHost } from '../shell/ToastHost';
import { useV2Store, cardsIn } from '../state/useV2Store';

// The Jam card starts the shared audio engine; jsdom has no Web Audio.
jest.mock('../../audio/jamEngine', () => ({
  ...jest.requireActual('../../audio/jamEngine'),
  initJam: () => {}, setPadPatch: () => ({}), setPadSettings: () => {}, setPadVolume: () => {},
}));
// The Harmony card preloads guitar samples.
jest.mock('../../audio/guitar', () => ({ preloadGuitar: () => Promise.resolve(), playGuitarNote: () => Promise.resolve() }));

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});
beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

// Card faces link between pages, so the page renders inside a router.
const App = () => (<MemoryRouter><PracticePage /><CardSheetHost /><ToastHost /></MemoryRouter>);
const openEmptyWorkspace = () => act(() => { const id = v2().addWorkspace('Empty'); v2().setActiveWorkspace(id); });
const v2 = () => useV2Store.getState();

it('renders workspace tabs and only registered cards of the active workspace', () => {
  render(<App />);
  expect(screen.getByRole('tab', { name: 'Practice' })).toHaveAttribute('aria-selected', 'true');
  ['Metronome', 'Timer', 'Scale', 'Circle of fifths', 'Note Trainer', 'Chords', 'Fretboard', 'Harmony', 'Jam'].forEach(name =>
    expect(screen.getByRole('article', { name })).toBeInTheDocument());
  act(() => v2().setRows('practice', [['future-card', 'metronome', 'timer', 'scale'], ['fretboard']]));
  expect(screen.getAllByRole('article')).toHaveLength(9); // 'future-card' isn't registered: hidden, kept
  expect(cardsIn(v2().workspaces[0])).toContain('future-card');
});

it('shows the empty state for a workspace with no registered cards', () => {
  openEmptyWorkspace();
  render(<App />);
  expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  // Both the toolbar and the empty state offer "Add card"; either opens the picker.
  fireEvent.click(screen.getAllByRole('button', { name: 'Add card' })[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Add card' })).getByRole('button', { name: /Metronome/ }));
  expect(screen.getByRole('article', { name: 'Metronome' })).toBeInTheDocument();
});

it('opens a card sheet, and removing that card closes the sheet and offers undo', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }));
  expect(screen.getByRole('dialog', { name: 'Metronome' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Metronome options' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
  expect(screen.queryByRole('dialog', { name: 'Metronome' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(screen.getByRole('article', { name: 'Metronome' })).toBeInTheDocument();
});

it('switching workspace closes an open sheet', () => {
  render(<App />);
  act(() => { v2().addWorkspace('Other'); });
  fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Other' }));
  expect(screen.queryByRole('dialog', { name: 'Metronome' })).toBeNull();
});

it('+ creates a workspace and opens its Edit workspace panel to name it and add cards', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));
  expect(v2().overlay).toEqual({ kind: 'workspace' });
  const sheet = screen.getByRole('dialog', { name: 'Edit workspace' });
  const input = within(sheet).getByRole('textbox', { name: 'Workspace name' });
  fireEvent.change(input, { target: { value: 'Scales warm-up' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('tab', { name: 'Scales warm-up' })).toBeInTheDocument();
});

it('"Add all cards" fills an empty workspace with every card', () => {
  openEmptyWorkspace();
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Add all cards' }));
  expect(screen.getByRole('article', { name: 'Metronome' })).toBeInTheDocument();
});

it('a second removal gets its own full toast lifetime, so Undo stays available', () => {
  jest.useFakeTimers();
  act(() => { v2().addCard('practice', 'x-one'); v2().addCard('practice', 'x-two'); });
  render(<App />);
  act(() => v2().removeCard('practice', 'x-one'));
  act(() => { jest.advanceTimersByTime(5000); });
  act(() => v2().removeCard('practice', 'x-two'));
  act(() => { jest.advanceTimersByTime(2000); }); // first toast's timer would have fired at 6s
  expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  jest.useRealTimers();
});

it('opens the card sheet on the side away from the card being edited', () => {
  render(<App />);
  const cell = screen.getByRole('article', { name: 'Metronome' });
  jest.spyOn(cell, 'getBoundingClientRect').mockReturnValue({ left: 900, width: 200, top: 0, height: 100, right: 1100, bottom: 100, x: 900, y: 0, toJSON: () => ({}) } as DOMRect);
  fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }));
  expect(screen.getByRole('dialog', { name: 'Metronome' })).toHaveAttribute('data-side', 'left');
});

it('card header is not itself a button; a dedicated handle carries keyboard reordering', () => {
  render(<App />);
  const card = screen.getByRole('article', { name: 'Scale' });
  const handle = within(card).getByRole('button', { name: 'Reorder Scale' });
  expect(handle).toHaveAttribute('aria-roledescription', 'draggable');
  // The header's controls come first in the card; the face's controls follow.
  expect(within(card).getAllByRole('button').slice(0, 3).map(b => b.getAttribute('aria-label')))
    .toEqual(['Reorder Scale', 'Scale settings', 'Scale options']);
});

it('card menu: focus moves into it, arrows move between items, Escape returns to the trigger', () => {
  act(() => { v2().addWorkspace('Other'); }); // gives the menu a "Move to Other" item
  render(<App />);
  const trigger = screen.getByRole('button', { name: 'Metronome options' });
  fireEvent.click(trigger);
  const items = screen.getAllByRole('menuitem');
  expect(items[0]).toHaveFocus();
  fireEvent.keyDown(items[0], { key: 'ArrowDown' });
  expect(items[1]).toHaveFocus();
  fireEvent.keyDown(items[1], { key: 'ArrowUp' });
  expect(items[0]).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('menu')).toBeNull();
  expect(trigger).toHaveFocus();
});

it('cards carry no "follows key/tempo" tags', () => {
  render(<App />);
  expect(screen.queryByText(/follows/i)).toBeNull();
});

it('cards have no ? (concepts) button, in the header or the side panel', () => {
  render(<App />);
  expect(screen.queryAllByRole('button', { name: /^Concepts in/ })).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Scale settings' }));
  expect(within(screen.getByRole('dialog', { name: 'Scale' })).queryByRole('button', { name: /^Concepts in/ })).toBeNull();
});

it('tapping outside the side panel closes it; tapping another card\'s ⚙ switches to it', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Metronome settings' }));
  const timerGear = screen.getByRole('button', { name: 'Timer settings' });
  fireEvent.pointerDown(timerGear);
  fireEvent.click(timerGear);
  expect(screen.getByRole('dialog', { name: 'Timer' })).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByRole('tab', { name: 'Practice' }));
  expect(screen.queryByRole('dialog', { name: 'Timer' })).toBeNull();
});

it('the workspace toolbar has no rename / duplicate / reset buttons (double-click a tab to rename)', () => {
  render(<App />);
  ['Rename workspace', 'Duplicate workspace', 'Reset workspace'].forEach(name =>
    expect(screen.queryByRole('button', { name })).toBeNull());
  fireEvent.doubleClick(screen.getByRole('tab', { name: 'Practice' }));
  expect(screen.getByRole('textbox', { name: 'Workspace name' })).toBeInTheDocument();
});

it('every card has a drag handle (even alone in its row), and every row has its own handle', () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: /Move row/ })).toBeNull();
  const fretboard = screen.getByRole('article', { name: 'Fretboard' });
  expect(within(fretboard).getByRole('button', { name: 'Reorder Fretboard' })).toHaveAttribute('aria-roledescription', 'draggable');
  expect(screen.getByRole('button', { name: 'Drag row 1' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^Drag row \d+$/ })).toHaveLength(v2().workspaces[0].rows.length);
});

it('a newly added card appears at the top (first card of the first row)', () => {
  render(<App />);
  act(() => v2().removeCard('practice', 'timer'));
  fireEvent.click(screen.getAllByRole('button', { name: 'Add card' })[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Add card' })).getByRole('button', { name: /Timer/ }));
  expect(v2().workspaces[0].rows[0][0]).toBe('timer');
  expect(screen.getAllByRole('article')[0]).toHaveAccessibleName('Timer');
});

it('the edit button opens the workspace panel', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit workspace' }));
  expect(v2().overlay).toEqual({ kind: 'workspace' });
});

it('with every workspace deleted, Practice invites you to create one (opening its panel)', () => {
  act(() => v2().removeWorkspace('practice'));
  render(<App />);
  expect(screen.getByText(/no workspaces/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create a workspace' }));
  expect(v2().workspaces).toHaveLength(1);
  expect(v2().overlay).toEqual({ kind: 'workspace' });
});

it('a row that overflows is split: what doesn\'t fit goes to a new row, so full-width cards are always alone', () => {
  act(() => useV2Store.setState({ workspaces: [{ id: 'practice', name: 'Practice', rows: [['metronome', 'timer', 'scale', 'jam'], ['fretboard', 'chord']] }] }));
  render(<App />);
  expect(v2().workspaces[0].rows).toEqual([['metronome', 'timer', 'scale'], ['jam'], ['fretboard'], ['chord']]);
});
