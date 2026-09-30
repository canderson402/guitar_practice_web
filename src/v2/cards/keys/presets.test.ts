import { DEFAULT_PRESETS, presetLabel, samePreset, addPreset, removePresetAt, setPresetInterval, validPresets } from './presets';

it('starts with 11, 8 and 6 beat presets', () => {
  expect(DEFAULT_PRESETS.map(presetLabel)).toEqual(['11 beats', '8 beats', '6 beats']);
});

it('labels presets by unit', () => {
  expect(presetLabel({ mode: 'bars', interval: 1 })).toBe('1 bar');
  expect(presetLabel({ mode: 'bars', interval: 2 })).toBe('2 bars');
  expect(presetLabel({ mode: 'time', interval: 30 })).toBe('30 sec');
});

it('adds (without duplicates), edits and removes presets', () => {
  const seven = { mode: 'beats' as const, interval: 7 };
  expect(addPreset(DEFAULT_PRESETS, seven).map(presetLabel)).toEqual(['11 beats', '8 beats', '6 beats', '7 beats']);
  expect(addPreset(DEFAULT_PRESETS, { mode: 'beats', interval: 8 })).toEqual(DEFAULT_PRESETS);
  expect(setPresetInterval(DEFAULT_PRESETS, 1, 12).map(presetLabel)).toEqual(['11 beats', '12 beats', '6 beats']);
  expect(setPresetInterval(DEFAULT_PRESETS, 1, 0)[1].interval).toBe(1); // never below 1
  expect(removePresetAt(DEFAULT_PRESETS, 0).map(presetLabel)).toEqual(['8 beats', '6 beats']);
  expect(samePreset(seven, { mode: 'beats', interval: 7 })).toBe(true);
});

it('reads saved presets: none saved → the defaults; an emptied list stays empty; junk is dropped', () => {
  expect(validPresets(undefined)).toEqual(DEFAULT_PRESETS);
  expect(validPresets([])).toEqual([]);
  expect(validPresets([{ mode: 'bars', interval: 2 }, { mode: 'x', interval: 1 }, { mode: 'beats', interval: -3 }]))
    .toEqual([{ mode: 'bars', interval: 2 }]);
});
