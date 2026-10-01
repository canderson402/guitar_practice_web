import { act } from '@testing-library/react';
import { useV2Store, V2_STORAGE_KEY, mergePersisted, migrateV2State, cardsIn } from './useV2Store';
import { ALL_CARDS_ROWS } from './defaultWorkspace';

const s = () => useV2Store.getState();
const ws = (id: string) => s().workspaces.find(w => w.id === id)!;
const reset = () => act(() => useV2Store.setState(useV2Store.getInitialState(), true));

beforeEach(() => { localStorage.clear(); reset(); });

describe('workspaces', () => {
  it('starts with one "Practice" workspace holding every card', () => {
    expect(s().workspaces.map(w => w.name)).toEqual(['Practice']);
    expect(s().activeWorkspaceId).toBe('practice');
    expect(ws('practice').rows).toEqual(ALL_CARDS_ROWS);
  });

  it('adds, renames, duplicates and reorders', () => {
    let id = '';
    act(() => { id = s().addWorkspace('Scales'); });
    expect(s().workspaces.at(-1)).toMatchObject({ id, name: 'Scales', rows: [] });
    act(() => s().renameWorkspace(id, 'Scales warm-up'));
    expect(ws(id).name).toBe('Scales warm-up');
    let dup = '';
    act(() => { dup = s().duplicateWorkspace('practice'); });
    expect(ws(dup)).toMatchObject({ name: 'Practice copy', rows: ALL_CARDS_ROWS });
    act(() => s().reorderWorkspaces(0, 1));
    expect(s().workspaces[1].id).toBe('practice');
  });

  it('ignores blank renames', () => {
    act(() => s().renameWorkspace('practice', '   '));
    expect(ws('practice').name).toBe('Practice');
  });

  it('any workspace can be deleted; deleting the active one activates a neighbor; undo restores it', () => {
    let id = '';
    act(() => { id = s().addWorkspace('Temp'); s().setActiveWorkspace(id); });
    act(() => s().removeWorkspace('practice'));
    expect(s().workspaces.map(w => w.id)).toEqual([id]);
    act(() => s().undoLast());
    expect(s().workspaces.map(w => w.id)).toEqual(['practice', id]);
    act(() => s().removeWorkspace(id));
    expect(s().activeWorkspaceId).toBe('practice');
  });

  it('the last workspace can be deleted too (no active workspace), and undo brings it back', () => {
    act(() => s().removeWorkspace('practice'));
    expect(s().workspaces).toEqual([]);
    expect(s().activeWorkspaceId).toBe('');
    act(() => s().undoLast());
    expect(s().activeWorkspaceId).toBe('practice');
  });
});

describe('cards', () => {
  let other = '';
  beforeEach(() => act(() => { other = s().addWorkspace('Other'); s().setRows(other, [['scale', 'future-card'], ['fretboard']]); }));

  it('adds a new card at the front of the first row (top), without duplicates', () => {
    act(() => s().addCard(other, 'metronome'));
    act(() => s().addCard(other, 'metronome'));
    expect(ws(other).rows[0]).toEqual(['metronome', 'scale', 'future-card']);
    let id = '';
    act(() => { id = s().addWorkspace(); s().addCard(id, 'timer'); });
    expect(ws(id).rows).toEqual([['timer']]);
  });

  it('removes a card (dropping an emptied row) and undo puts it back in place', () => {
    const layout = [['metronome', 'timer', 'scale'], ['fretboard']];
    act(() => useV2Store.setState({ workspaces: [{ id: 'practice', name: 'Practice', rows: layout }] }));
    act(() => s().removeCard('practice', 'timer'));
    expect(ws('practice').rows).toEqual([['metronome', 'scale'], ['fretboard']]);
    act(() => s().undoLast());
    expect(ws('practice').rows).toEqual(layout);
    act(() => s().removeCard('practice', 'fretboard'));
    expect(ws('practice').rows).toEqual([['metronome', 'timer', 'scale']]);
    act(() => s().undoLast());
    expect(ws('practice').rows).toEqual(layout);
  });

  it('undo keeps edits made while the toast was up', () => {
    act(() => s().removeCard('practice', 'timer'));
    act(() => s().renameWorkspace(other, 'Other lab'));
    act(() => s().undoLast());
    expect(cardsIn(ws('practice'))).toContain('timer');
    expect(ws(other).name).toBe('Other lab');
  });

  it('moves a card to another workspace (to its top)', () => {
    act(() => s().moveCardToWorkspace('timer', 'practice', other));
    expect(cardsIn(ws('practice'))).not.toContain('timer');
    expect(ws(other).rows[0][0]).toBe('timer');
  });

  it('setRows replaces the layout but keeps ids it did not mention (unregistered cards) in a last row', () => {
    act(() => s().setRows(other, [['fretboard'], ['scale']]));
    expect(ws(other).rows).toEqual([['fretboard'], ['scale'], ['future-card']]);
    act(() => useV2Store.setState({ workspaces: [...s().workspaces.filter(w => w.id !== 'practice'), { id: 'practice', name: 'Practice', rows: [['metronome', 'timer'], ['scale', 'fretboard']] }] }));
    act(() => s().setRows('practice', [['fretboard'], ['timer'], []]));
    expect(ws('practice').rows).toEqual([['fretboard'], ['timer'], ['metronome', 'scale']]);
  });

  it('closes an open card sheet when that card is removed', () => {
    act(() => s().setOverlay({ kind: 'cardSheet', cardId: 'metronome' }));
    act(() => s().removeCard('practice', 'metronome'));
    expect(s().overlay).toBeNull();
  });
});

describe('overlays', () => {
  it('dock pop-ups are tracked separately, so opening one keeps an open card sheet', () => {
    act(() => { s().setOverlay({ kind: 'cardSheet', cardId: 'metronome' }); s().setPopover('key'); });
    expect(s().overlay).toEqual({ kind: 'cardSheet', cardId: 'metronome' });
    expect(s().popover).toBe('key');
    act(() => s().setPopover(null));
    expect(s().popover).toBeNull();
  });

  it('undo of a workspace delete restores it at its position without reverting other edits', () => {
    let a = ''; let b = '';
    act(() => { a = s().addWorkspace('A'); b = s().addWorkspace('B'); });
    act(() => s().removeWorkspace(a));
    act(() => s().addCard(b, 'metronome'));
    act(() => s().undoLast());
    expect(s().workspaces.map(w => w.id).slice(-2)).toEqual([a, b]);
    expect(ws(b).rows).toEqual([['metronome']]);
  });
});

describe('persistence', () => {
  it('persists workspaces and theme but not ui state', () => {
    act(() => { s().setThemeMode('light'); s().setOverlay({ kind: 'settings' }); });
    const saved = JSON.parse(localStorage.getItem(V2_STORAGE_KEY)!).state;
    expect(saved.themeMode).toBe('light');
    expect(saved.workspaces[0].rows).toEqual(ALL_CARDS_ROWS);
    expect(saved.overlay).toBeUndefined();
    expect(saved.toast).toBeUndefined();
  });

  it('keeps exactly the saved workspaces (even none) and repairs malformed fields', () => {
    const merged = mergePersisted(
      { themeMode: 'neon', workspaces: [{ id: 'x', name: 'Mine', rows: [['metronome', 42], []] }], activeWorkspaceId: 'gone' },
      useV2Store.getInitialState(),
    );
    expect(merged.themeMode).toBe('dark');
    expect(merged.workspaces).toEqual([{ id: 'x', name: 'Mine', rows: [['metronome']] }]);
    expect(merged.activeWorkspaceId).toBe('x');
    const none = mergePersisted({ workspaces: [], activeWorkspaceId: '' }, useV2Store.getInitialState());
    expect(none.workspaces).toEqual([]);
    expect(none.activeWorkspaceId).toBe('');
  });

  it('dedupes workspace ids and card ids from stale saved state', () => {
    const merged = mergePersisted({
      workspaces: [
        { id: 'x', name: 'Mine', rows: [['metronome', 'metronome'], ['timer', 'metronome']] },
        { id: 'x', name: 'Dup', rows: [] },
      ],
    }, useV2Store.getInitialState());
    expect(merged.workspaces).toEqual([{ id: 'x', name: 'Mine', rows: [['metronome'], ['timer']] }]);
  });

  it('upgrading from the old four-workspace format starts over with the single Practice workspace, keeping other settings', () => {
    const migrated = migrateV2State({ themeMode: 'light', workspaces: [{ id: 'warm-up', name: 'Warm-up', builtIn: true, cards: ['timer'] }], activeWorkspaceId: 'warm-up', cardPrefs: { fretboard: { frets: 15 } } }, 1);
    expect(migrated).toMatchObject({ themeMode: 'light', activeWorkspaceId: 'practice', cardPrefs: { fretboard: { frets: 15 } } });
    expect((migrated as { workspaces: unknown[] }).workspaces).toEqual([{ id: 'practice', name: 'Practice', rows: ALL_CARDS_ROWS }]);
  });

  it('with nothing saved, starts with the default workspace', () => {
    expect(mergePersisted(undefined, useV2Store.getInitialState()).workspaces.map(w => w.id)).toEqual(['practice']);
  });

  it('survives corrupt persisted JSON', () => {
    expect(mergePersisted('garbage', useV2Store.getInitialState()).workspaces.map(w => w.id)).toEqual(['practice']);
  });

  it('rehydrating from corrupt localStorage keeps working defaults', async () => {
    localStorage.setItem(V2_STORAGE_KEY, '{not json');
    await act(async () => { await useV2Store.persist.rehydrate(); });
    expect(s().workspaces.map(w => w.id)).toEqual(['practice']);
  });
});

describe('card prefs', () => {
  it('stores per-card settings and persists them', () => {
    act(() => s().setCardPref('fretboard', 'frets', 15));
    expect(s().cardPrefs.fretboard.frets).toBe(15);
    const saved = JSON.parse(localStorage.getItem(V2_STORAGE_KEY)!).state;
    expect(saved.cardPrefs.fretboard.frets).toBe(15);
  });

  it('ignores malformed saved card prefs', () => {
    expect(mergePersisted({ cardPrefs: 'x' }, useV2Store.getInitialState()).cardPrefs).toEqual({});
  });
});

describe('change presets (shared by the Note Trainer and Jam)', () => {
  it('start as 11, 8 and 6 beats; saved in the browser', () => {
    expect(s().changePresets).toBeUndefined();
    act(() => s().setChangePresets([{ mode: 'bars', interval: 2 }]));
    expect(JSON.parse(localStorage.getItem(V2_STORAGE_KEY)!).state.changePresets).toEqual([{ mode: 'bars', interval: 2 }]);
  });

  it('picks up presets saved by the Note Trainer before they were shared', () => {
    const merged = mergePersisted({ cardPrefs: { 'note-trainer': { presets: [{ mode: 'beats', interval: 7 }] } } }, useV2Store.getInitialState());
    expect(merged.changePresets).toEqual([{ mode: 'beats', interval: 7 }]);
    expect(mergePersisted({ changePresets: [{ mode: 'beats', interval: 5 }, { mode: 'nope', interval: 1 }] }, useV2Store.getInitialState()).changePresets)
      .toEqual([{ mode: 'beats', interval: 5 }]);
  });
});
