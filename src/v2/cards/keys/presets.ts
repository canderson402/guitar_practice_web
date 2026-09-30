/** A Note Trainer "change every" preset: a unit and a count. */
export type PresetMode = 'bars' | 'beats' | 'time';
export interface Preset { mode: PresetMode; interval: number }

/** The starting presets (editable like any other). 11 beats: up and back down
 *  all six strings, one note per string. */
export const DEFAULT_PRESETS: Preset[] = [
  { mode: 'beats', interval: 11 },
  { mode: 'beats', interval: 8 },
  { mode: 'beats', interval: 6 },
];

const UNIT: Record<PresetMode, [string, string]> = { beats: ['beat', 'beats'], bars: ['bar', 'bars'], time: ['sec', 'sec'] };

export const presetUnit = (p: Preset): string => UNIT[p.mode][p.interval === 1 ? 0 : 1];
export const presetLabel = (p: Preset): string => `${p.interval} ${presetUnit(p)}`;
export const presetMax = (mode: PresetMode): number => (mode === 'beats' ? 48 : 16);

export const samePreset = (a: Preset, b: Preset): boolean => a.mode === b.mode && a.interval === b.interval;

/** Adds `p` unless an identical preset is already in the list. */
export const addPreset = (list: Preset[], p: Preset): Preset[] =>
  list.some(x => samePreset(x, p)) ? list : [...list, { mode: p.mode, interval: p.interval }];

export const removePresetAt = (list: Preset[], i: number): Preset[] => list.filter((_, k) => k !== i);

export const setPresetInterval = (list: Preset[], i: number, interval: number): Preset[] =>
  list.map((p, k) => (k === i ? { ...p, interval: Math.min(presetMax(p.mode), Math.max(1, Math.round(interval))) } : p));

/** Saved presets: nothing saved yet → the defaults; malformed entries dropped. */
export const validPresets = (v: unknown): Preset[] => (v === undefined ? DEFAULT_PRESETS : (Array.isArray(v) ? v : []).filter((p): p is Preset =>
  !!p && ['bars', 'beats', 'time'].includes(p.mode) && Number.isInteger(p.interval) && p.interval > 0));
