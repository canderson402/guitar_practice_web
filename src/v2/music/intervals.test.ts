import { chromaticPosition, intervalSymbol, intervalName, scaleDegreeLabels } from './intervals';

it('computes interval symbols from a root', () => {
  expect(chromaticPosition('Eb')).toBe(3);
  expect(intervalSymbol('A', 'C')).toBe('♭3');
  expect(intervalSymbol('C', 'G')).toBe('5');
  expect(intervalSymbol('C', 'F#')).toBe('♯4');
});

it('names intervals in words', () => {
  expect(intervalName('♭3')).toBe('minor third');
  expect(intervalName('1')).toBe('root');
  expect(intervalName('♯4')).toBe('tritone');
  expect(intervalName('?')).toBeNull();
});

it('uses the scale\'s own degree labels (so modes read naturally)', () => {
  expect(scaleDegreeLabels('Aeolian (Natural Minor)')).toEqual(['1', '2', '♭3', '4', '5', '♭6', '♭7']);
  expect(scaleDegreeLabels('nope')).toBeNull();
});

it('places unusual spellings at their real pitch (not C)', () => {
  expect(['Ebb', 'Fb', 'Cb', 'B#', 'Abb'].map(chromaticPosition)).toEqual([2, 4, 11, 0, 7]);
});
