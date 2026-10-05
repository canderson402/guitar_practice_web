import { getScaleNotes, getChromaticPosition, getScaleChords, getChordChromaticPositions, scales } from './musicData';

it('offers a Chromatic scale with all twelve notes from the root', () => {
  expect(Object.keys(scales)).toContain('Chromatic');
  expect(getScaleNotes('A', 'Chromatic' as keyof typeof scales)).toEqual(
    ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']);
  expect(getScaleNotes('Eb', 'Chromatic' as keyof typeof scales)[1]).toBe('E');
});

it('knows the pitch of any spelling, including Fb, Cb, E#, B# and double accidentals', () => {
  expect(['Fb', 'Cb', 'E#', 'B#', 'Ebb', 'Bbb', 'F##', 'Cx'].map(getChromaticPosition)).toEqual([4, 11, 5, 0, 2, 9, 7, 2]);
  expect(getChromaticPosition('Db')).toBe(1);
});

it('gets chord qualities right in keys spelled with double flats (Db Locrian)', () => {
  expect(getScaleNotes('Db', 'Locrian')).toEqual(['Db', 'Ebb', 'Fb', 'Gb', 'Abb', 'Bbb', 'Cb']);
  expect(getScaleChords('Db', 'Locrian').map(c => c.roman)).toEqual(['i°', 'II', 'iii', 'iv', 'V', 'VI', 'vii']);
});

it('chord positions for a type it doesn\'t know are empty (no crash)', () => {
  expect(getChordChromaticPositions('C', 'maj9' as never)).toEqual([]);
});

it('offers Phrygian Dominant, spelled with one letter per degree', () => {
  expect(getScaleNotes('E', 'Phrygian Dominant')).toEqual(['E', 'F', 'G#', 'A', 'B', 'C', 'D']);
  expect(getScaleChords('E', 'Phrygian Dominant').map(c => c.roman)).toEqual(['I', 'II', 'iii°', 'iv', 'v°', 'VI+', 'vii']);
});
