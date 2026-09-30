import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceSheet } from './WorkspaceSheet';
import { useV2Store } from '../state/useV2Store';

const v2 = () => useV2Store.getState();
const ws = () => v2().workspaces.find(w => w.id === v2().activeWorkspaceId)!;

beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  // A fixed two-row layout, independent of the default workspace.
  useV2Store.setState({ workspaces: [{ id: 'practice', name: 'Practice', rows: [['metronome', 'timer', 'scale'], ['fretboard']] }] });
  v2().setOverlay({ kind: 'workspace' });
}));

const open = () => render(<MemoryRouter><WorkspaceSheet /></MemoryRouter>);

it('renames the workspace', () => {
  open();
  const name = screen.getByRole('textbox', { name: 'Workspace name' });
  fireEvent.change(name, { target: { value: 'Morning' } });
  fireEvent.blur(name);
  expect(ws().name).toBe('Morning');
});

it('lists rows with their cards and reorders rows', () => {
  open();
  const rows = screen.getAllByRole('group', { name: /^Row \d/ });
  expect(rows).toHaveLength(2);
  expect(within(rows[0]).getByText('Metronome')).toBeInTheDocument();
  fireEvent.click(within(rows[1]).getByRole('button', { name: 'Move row 2 up' }));
  expect(ws().rows).toEqual([['fretboard'], ['metronome', 'timer', 'scale']]);
});

it('moves a card left/right within its row and up/down into another (or a new) row', () => {
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Move Timer left' }));
  expect(ws().rows[0]).toEqual(['timer', 'metronome', 'scale']);
  fireEvent.click(screen.getByRole('button', { name: 'Move Scale down a row' }));
  expect(ws().rows).toEqual([['timer', 'metronome'], ['fretboard', 'scale']]);
  fireEvent.click(screen.getByRole('button', { name: 'Move Timer up a row' }));
  expect(ws().rows).toEqual([['timer'], ['metronome'], ['fretboard', 'scale']]);
});

it('any workspace can be deleted from the panel, including the last one', () => {
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Delete workspace' }));
  expect(v2().workspaces).toEqual([]);
});

it('removes a card from the panel (with Undo)', () => {
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Timer' }));
  expect(ws().rows).toEqual([['metronome', 'scale'], ['fretboard']]);
  expect(v2().toast).toMatchObject({ undoable: true });
});

it('adds a card to a chosen row from the cards not in the workspace', () => {
  act(() => v2().removeCard('practice', 'timer'));
  open();
  fireEvent.click(screen.getByRole('button', { name: 'Add card to row 1' }));
  const menu = screen.getByRole('menu', { name: 'Add card to row 1' });
  expect(within(menu).queryByRole('menuitem', { name: 'Metronome' })).toBeNull(); // already in the workspace
  fireEvent.click(within(menu).getByRole('menuitem', { name: 'Timer' }));
  expect(ws().rows).toEqual([['metronome', 'scale', 'timer'], ['fretboard']]);
  expect(screen.queryByRole('menu')).toBeNull();
});

it('an empty workspace shows one empty row with its own Add card button', () => {
  act(() => { const id = v2().addWorkspace('Empty'); v2().setActiveWorkspace(id); v2().setOverlay({ kind: 'workspace' }); });
  open();
  expect(screen.getAllByRole('group', { name: /^Row \d/ })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Add card to row 1' }));
  fireEvent.click(within(screen.getByRole('menu', { name: 'Add card to row 1' })).getByRole('menuitem', { name: 'Metronome' }));
  expect(ws().rows).toEqual([['metronome']]);
});

it('no "Rows" heading or helper text, and Add card lives only inside rows', () => {
  open();
  expect(screen.queryByText('Rows')).toBeNull();
  expect(screen.queryByText(/starts a new row/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Add card in a new row' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Add card to row 1' })).toHaveTextContent(/^Add card$/);
});

it('a full row has no Add card; other rows only offer cards that fit the space left', () => {
  open();
  expect(screen.queryByRole('button', { name: 'Add card to row 2' })).toBeNull(); // Fretboard fills row 2
  fireEvent.click(screen.getByRole('button', { name: 'Add card to row 1' }));    // 3 small cards: 3 columns left
  const menu = screen.getByRole('menu', { name: 'Add card to row 1' });
  expect(within(menu).getByRole('menuitem', { name: 'Chords' })).toBeInTheDocument();
  expect(within(menu).queryByRole('menuitem', { name: 'Jam' })).toBeNull();       // full width: doesn't fit
});
