import { stepNote, shiftAll, matchPreset } from './tuning';
import { TUNING_PRESETS } from './tunings';

it('nudges a string by a semitone: flats going down, sharps going up', () => {
  expect(stepNote('E', -1)).toBe('Eb');
  expect(stepNote('Eb', -1)).toBe('D');
  expect(stepNote('E', 1)).toBe('F');
  expect(stepNote('F', 1)).toBe('F#');
  expect(stepNote('C', -1)).toBe('B');
  expect(stepNote('B', 1)).toBe('C');
});

it('shifts every string together', () => {
  expect(shiftAll(['E', 'B', 'G', 'D', 'A', 'E'], -1)).toEqual(['Eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb']);
});

it('recognises presets by pitch, regardless of spelling', () => {
  expect(matchPreset(['E', 'B', 'G', 'D', 'A', 'E'])?.name).toBe('Standard');
  expect(matchPreset(['D#', 'A#', 'F#', 'C#', 'G#', 'D#'])?.name).toBe('Half step down');
  expect(matchPreset(['D', 'A', 'G', 'D', 'A', 'D'])).toBeUndefined(); // DADGAD: custom, still allowed
  expect(TUNING_PRESETS.length).toBeGreaterThan(0);
});
