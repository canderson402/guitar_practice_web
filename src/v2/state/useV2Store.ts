import type { PickedNote } from '../cards/fretboard/pickNote';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_WORKSPACE } from './defaultWorkspace';
import { rowsFromFlat } from '../cards/rows';
import { validPresets } from '../cards/keys/presets';
import type { Preset } from '../cards/keys/presets';

/** A workspace's cards, arranged in rows you set (top to bottom, left to right). */
export interface Workspace { id: string; name: string; rows: string[][] }

/** Every card id in a workspace, in reading order. */
export const cardsIn = (w: Workspace): string[] => w.rows.flat();
export type ThemeMode = 'dark' | 'light' | 'system';
/** Sheets (card settings, app settings). One at a time. */
export type Overlay =
  | { kind: 'cardSheet'; cardId: string }
  | { kind: 'settings' }
  | { kind: 'workspace' }
  | null;

/** Dock quick pop-ups — tracked separately so they don't close a sheet. */
export type PopoverId = 'key' | 'tempo' | 'meter';

/** What Undo puts back: only the removed item, never a whole snapshot. */
type UndoEntry =
  | { kind: 'card'; workspaceId: string; cardId: string; row: number; index: number; rowRemoved: boolean }
  | { kind: 'workspace'; workspace: Workspace; index: number; wasActive: boolean };

interface Persisted {
  themeMode: ThemeMode;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  /** Per-card view settings (e.g. fretboard frets/labels), keyed by card id. */
  cardPrefs: Record<string, Record<string, unknown>>;
  /** "Change every" presets shared by the Note Trainer and Jam. Undefined =
   *  never edited (the defaults apply). */
  changePresets?: Preset[];
  /** A4 in Hz — what everything is tuned to. */
  referencePitch: number;
}

export const REFERENCE_PITCH = { default: 440, min: 200, max: 1000 };
const clampPitch = (hz: number) => Math.max(REFERENCE_PITCH.min, Math.min(REFERENCE_PITCH.max, hz));

export interface V2State extends Persisted {
  overlay: Overlay;
  popover: PopoverId | null;
  /** An out-of-key note clicked on the Fretboard (not persisted). */
  pickedNote: PickedNote | null;
  /** Whether a note is selected at all (like a chord, it can be toggled off).
   *  Off by default; not persisted. */
  noteSelected: boolean;
  toast: { id: number; message: string; undoable: boolean } | null;
  undo: UndoEntry | null;
  setThemeMode(m: ThemeMode): void;
  setReferencePitch(hz: number): void;
  setActiveWorkspace(id: string): void;
  addWorkspace(name?: string): string;
  renameWorkspace(id: string, name: string): void;
  duplicateWorkspace(id: string): string;
  removeWorkspace(id: string): void;
  reorderWorkspaces(from: number, to: number): void;
  addCard(workspaceId: string, cardId: string): void;
  removeCard(workspaceId: string, cardId: string): void;
  /** Replace the row layout. Card ids it doesn't mention (e.g. cards not
   *  built yet) are kept, in a last row. Empty rows are dropped. */
  setRows(workspaceId: string, rows: string[][]): void;
  moveCardToWorkspace(cardId: string, fromId: string, toId: string): void;
  undoLast(): void;
  setCardPref(cardId: string, key: string, value: unknown): void;
  setChangePresets(presets: Preset[]): void;
  setOverlay(o: Overlay): void;
  setPopover(p: PopoverId | null): void;
  setPickedNote(p: PickedNote | null): void;
  setNoteSelected(on: boolean): void;
  dismissToast(): void;
}

export const V2_STORAGE_KEY = 'gp2';

const cloneRows = (rows: string[][]): string[][] => rows.map(r => [...r]);
const defaultWorkspaces = (): Workspace[] => [{ ...DEFAULT_WORKSPACE, rows: cloneRows(DEFAULT_WORKSPACE.rows) }];

// Cards that always take a full row — used only to convert old flat saves.
const FULL_WIDTH = ['fretboard', 'harmony'];

/** Validate rows from storage: strings only, each id once, no empty rows. */
const sanitizeRows = (raw: unknown): string[][] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map(r => (Array.isArray(r) ? r : []).filter((c): c is string => typeof c === 'string' && !seen.has(c) && (seen.add(c), true)))
    .filter(r => r.length > 0);
};

const newId = (): string => `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const THEME_MODES: ThemeMode[] = ['dark', 'light', 'system'];

let toastSeq = 0;
const nextToast = (message: string, undoable: boolean) => ({ id: ++toastSeq, message, undoable });

/** Merge persisted state from any older build into current defaults, field by
 *  field. Anything malformed falls back to the default for that field. */
export const mergePersisted = (persisted: unknown, current: V2State): V2State => {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Partial<Persisted>;
  const themeMode = THEME_MODES.includes(p.themeMode as ThemeMode) ? (p.themeMode as ThemeMode) : current.themeMode;

  // Saved workspaces are kept exactly (even an empty list: the user deleted
  // them all). Nothing saved at all → the default workspace.
  const seen = new Set<string>();
  const workspaces: Workspace[] = !Array.isArray(p.workspaces) ? defaultWorkspaces() : p.workspaces
    .filter((w): w is Workspace & { cards?: unknown } => !!w && typeof w.id === 'string' && typeof w.name === 'string')
    .filter(w => (seen.has(w.id) ? false : (seen.add(w.id), true)))   // first copy of an id wins
    .map(w => ({
      id: w.id,
      name: w.name,
      // Older saves stored a flat `cards` list: convert it to rows.
      rows: Array.isArray(w.rows)
        ? sanitizeRows(w.rows)
        : sanitizeRows(rowsFromFlat(Array.isArray(w.cards) ? w.cards.filter((c): c is string => typeof c === 'string') : [], FULL_WIDTH)),
    }));

  const activeWorkspaceId = workspaces.some(w => w.id === p.activeWorkspaceId)
    ? (p.activeWorkspaceId as string)
    : (workspaces[0]?.id ?? '');

  const cardPrefs = p.cardPrefs && typeof p.cardPrefs === 'object' && !Array.isArray(p.cardPrefs) ? p.cardPrefs : {};

  // Change presets used to live in the Note Trainer's card prefs.
  const legacyPresets = (cardPrefs['note-trainer'] as Record<string, unknown> | undefined)?.presets;
  const savedPresets = p.changePresets ?? legacyPresets;
  const changePresets = savedPresets === undefined ? undefined : validPresets(savedPresets);

  const referencePitch = typeof p.referencePitch === 'number' && Number.isFinite(p.referencePitch) ? clampPitch(p.referencePitch) : current.referencePitch;

  return { ...current, themeMode, workspaces, activeWorkspaceId, cardPrefs, changePresets, referencePitch };
};

/** Saved-format upgrades. v1 had four built-in workspaces; v2 starts over
 *  with the single default workspace, keeping every other setting. */
export const migrateV2State = (persisted: unknown, version: number): Persisted => {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Persisted;
  if (version < 2) return { ...p, workspaces: defaultWorkspaces(), activeWorkspaceId: DEFAULT_WORKSPACE.id };
  return p;
};

export const useV2Store = create<V2State>()(
  persist(
    (set, get) => {
      const updateWs = (id: string, fn: (w: Workspace) => Workspace) =>
        set(s => ({ workspaces: s.workspaces.map(w => (w.id === id ? fn(w) : w)) }));

      return {
        themeMode: 'dark',
        workspaces: defaultWorkspaces(),
        activeWorkspaceId: DEFAULT_WORKSPACE.id,
        cardPrefs: {},
        referencePitch: REFERENCE_PITCH.default,
        overlay: null,
        popover: null,
        pickedNote: null,
        noteSelected: false,
        toast: null,
        undo: null,

        setThemeMode: themeMode => set({ themeMode }),
        setReferencePitch: hz => { if (Number.isFinite(hz)) set({ referencePitch: Math.round(clampPitch(hz) * 10) / 10 }); },

        setActiveWorkspace: id => {
          if (get().workspaces.some(w => w.id === id)) set({ activeWorkspaceId: id, overlay: null });
        },

        addWorkspace: (name = 'New workspace') => {
          const id = newId();
          set(s => ({ workspaces: [...s.workspaces, { id, name, rows: [] }] }));
          return id;
        },

        renameWorkspace: (id, name) => {
          const trimmed = name.trim();
          if (trimmed) updateWs(id, w => ({ ...w, name: trimmed }));
        },

        duplicateWorkspace: id => {
          const src = get().workspaces.find(w => w.id === id);
          if (!src) return '';
          const copyId = newId();
          set(s => ({
            workspaces: [...s.workspaces, { id: copyId, name: `${src.name} copy`, rows: cloneRows(src.rows) }],
          }));
          return copyId;
        },

        removeWorkspace: id => {
          const { workspaces, activeWorkspaceId } = get();
          const target = workspaces.find(w => w.id === id);
          if (!target) return;
          const idx = workspaces.indexOf(target);
          const rest = workspaces.filter(w => w.id !== id);
          // Deleting the active one activates a neighbor; deleting the last leaves none.
          const nextActive = activeWorkspaceId === id ? (rest[Math.max(0, idx - 1)]?.id ?? '') : activeWorkspaceId;
          set({
            undo: { kind: 'workspace', workspace: target, index: idx, wasActive: activeWorkspaceId === id },
            workspaces: rest,
            activeWorkspaceId: nextActive,
            overlay: null,
            toast: nextToast(`Deleted "${target.name}"`, true),
          });
        },

        reorderWorkspaces: (from, to) => set(s => ({ workspaces: move(s.workspaces, from, to) })),

        // New cards go to the top: the front of the first row.
        addCard: (workspaceId, cardId) =>
          updateWs(workspaceId, w => {
            if (cardsIn(w).includes(cardId)) return w;
            const [first, ...rest] = w.rows;
            return { ...w, rows: first ? [[cardId, ...first], ...rest] : [[cardId]] };
          }),

        removeCard: (workspaceId, cardId) => {
          const ws = get().workspaces.find(w => w.id === workspaceId);
          const row = ws ? ws.rows.findIndex(r => r.includes(cardId)) : -1;
          if (!ws || row < 0) return;
          const overlay = get().overlay;
          set({
            undo: { kind: 'card', workspaceId, cardId, row, index: ws.rows[row].indexOf(cardId), rowRemoved: ws.rows[row].length === 1 },
            toast: nextToast('Card removed', true),
            overlay: overlay?.kind === 'cardSheet' && overlay.cardId === cardId ? null : overlay,
          });
          updateWs(workspaceId, w => ({ ...w, rows: w.rows.map(r => r.filter(c => c !== cardId)).filter(r => r.length > 0) }));
        },

        setRows: (workspaceId, rows) => updateWs(workspaceId, w => {
          const next = sanitizeRows(rows);
          const mentioned = new Set(next.flat());
          const kept = cardsIn(w).filter(id => !mentioned.has(id));
          return { ...w, rows: kept.length ? [...next, kept] : next };
        }),

        moveCardToWorkspace: (cardId, fromId, toId) => {
          if (fromId === toId) return;
          updateWs(fromId, w => ({ ...w, rows: w.rows.map(r => r.filter(c => c !== cardId)).filter(r => r.length > 0) }));
          get().addCard(toId, cardId);
        },

        undoLast: () => {
          const entry = get().undo;
          if (!entry) return;
          if (entry.kind === 'card') {
            updateWs(entry.workspaceId, w => {
              if (cardsIn(w).includes(entry.cardId)) return w;
              const rows = cloneRows(w.rows);
              if (entry.rowRemoved || !rows[entry.row]) rows.splice(Math.min(entry.row, rows.length), 0, [entry.cardId]);
              else rows[entry.row].splice(Math.min(entry.index, rows[entry.row].length), 0, entry.cardId);
              return { ...w, rows };
            });
          } else if (!get().workspaces.some(w => w.id === entry.workspace.id)) {
            const workspaces = [...get().workspaces];
            workspaces.splice(Math.min(entry.index, workspaces.length), 0, entry.workspace);
            set({ workspaces, ...(entry.wasActive ? { activeWorkspaceId: entry.workspace.id } : {}) });
          }
          set({ undo: null, toast: null });
        },


        setChangePresets: changePresets => set({ changePresets }),
        setCardPref: (cardId, key, value) =>
          set(s => ({ cardPrefs: { ...s.cardPrefs, [cardId]: { ...s.cardPrefs[cardId], [key]: value } } })),

        setOverlay: overlay => set({ overlay }),

        setPopover: popover => set({ popover }),
        setPickedNote: pickedNote => set({ pickedNote }),
        setNoteSelected: noteSelected => set({ noteSelected }),

        dismissToast: () => set({ toast: null, undo: null }),
      };
    },
    {
      name: V2_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({
        themeMode: s.themeMode,
        workspaces: s.workspaces,
        activeWorkspaceId: s.activeWorkspaceId,
        cardPrefs: s.cardPrefs,
        changePresets: s.changePresets,
        referencePitch: s.referencePitch,
      }),
      // Future format changes: transform here per version; merge() then
      // validates field by field, so an unknown shape never wipes saved data.
      migrate: migrateV2State,
      merge: (persisted, current) => mergePersisted(persisted, current),
    },
  ),
);
