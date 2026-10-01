import { chordPitches, chordDegreeOf, chordNameOf, scaleNameOf } from './chordPitches';

it('a built chord brings its own intervals (any chord, extensions folded into one octave)', () => {
  expect(chordPitches({ note: 'C', type: 'custom', symbol: 'maj9', roman: '', intervals: [0, 4, 7, 11, 14] })).toEqual([0, 4, 7, 11, 2]);
});

it('an in-key chord uses its type', () => {
  expect(chordPitches({ note: 'A', type: 'minor', symbol: 'm', roman: 'vi' })).toEqual([9, 0, 4]);
});

describe('interval labels while a chord shows (measured from the chord\'s root, not the key)', () => {
  it('a built chord labels its tones with its own degrees, folded into one octave (F maj9: 1 3 5 7 2)', () => {
    const degreeOf = chordDegreeOf({ note: 'F', type: 'custom', symbol: 'maj9', roman: '', intervals: [0, 4, 7, 11, 14] });
    expect(['F', 'A', 'C', 'E', 'G'].map(degreeOf)).toEqual(['1', '3', '5', '7', '2']);
  });

  it('every compound interval folds: ♭9 ♯9 11 ♯11 13 → ♭2 ♯2 4 ♯4 6', () => {
    const degreeOf = chordDegreeOf({ note: 'C', type: 'custom', symbol: 'x', roman: '', intervals: [0, 13, 15, 17, 18, 21] });
    expect(['C#', 'D#', 'F', 'F#', 'A'].map(degreeOf)).toEqual(['♭2', '♯2', '4', '♯4', '6']);
  });

  it('special spellings come through (°7 → 𝄫7, 7♯9 → ♯2)', () => {
    expect(chordDegreeOf({ note: 'C', type: 'custom', symbol: '°7', roman: '', intervals: [0, 3, 6, 9] })('A')).toBe('𝄫7');
    expect(chordDegreeOf({ note: 'C', type: 'custom', symbol: '7♯9', roman: '', intervals: [0, 4, 7, 10, 15] })('D#')).toBe('♯2');
  });

  it('an in-key chord too (Am: C is the ♭3)', () => {
    expect(chordDegreeOf({ note: 'A', type: 'minor', symbol: 'm', roman: 'vi' })('C')).toBe('♭3');
  });

  it('a note outside the chord gets its interval from the chord\'s root', () => {
    expect(chordDegreeOf({ note: 'Eb', type: 'custom', symbol: 'maj9', roman: '', intervals: [0, 4, 7, 11, 14] })('C')).toBe('6');
  });
});

describe('note names spelled for the context', () => {
  it('chord tones are spelled from the chord\'s root by degree', () => {
    const ebmaj9 = chordNameOf({ note: 'Eb', type: 'custom', symbol: 'maj9', roman: '', intervals: [0, 4, 7, 11, 14] });
    expect(['D#', 'G', 'A#', 'D', 'F'].map(ebmaj9)).toEqual(['Eb', 'G', 'Bb', 'D', 'F']);
    const c7s9 = chordNameOf({ note: 'C', type: 'custom', symbol: '7♯9', roman: '', intervals: [0, 4, 7, 10, 15] });
    expect(['C', 'E', 'G', 'A#', 'D#'].map(c7s9)).toEqual(['C', 'E', 'G', 'Bb', 'D#']);
    expect(chordNameOf({ note: 'C', type: 'custom', symbol: '°7', roman: '', intervals: [0, 3, 6, 9] })('A')).toBe('Bbb');
  });

  it('notes outside the chord keep their name', () => {
    expect(chordNameOf({ note: 'Eb', type: 'custom', symbol: 'maj7', roman: '', intervals: [0, 4, 7, 11] })('C#')).toBe('C#');
  });

  it('without a chord, notes in the key use the key\'s spelling', () => {
    const f = scaleNameOf(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
    expect(['A#', 'F', 'C#'].map(f)).toEqual(['Bb', 'F', 'C#']);
  });
});
