import { BASES, EXTENSIONS, ALTERATIONS, buildChord, isAllowed, altAllowed, CHORD_TYPES, chordType } from './chordBuilder';

it('offers the classic qualities and extensions', () => {
  expect(BASES.map(b => b.label)).toEqual(['Major', 'Minor', 'Dim', 'Aug', 'Sus2', 'Sus4', '5']);
  expect(EXTENSIONS.map(e => e.label)).toEqual(['—', '6', '7', 'maj7', '9', 'maj9', '11', '13', 'add9']);
});

it.each([
  ['major', 'none', '', [0, 4, 7], '1 3 5'],
  ['minor', 'none', 'm', [0, 3, 7], '1 ♭3 5'],
  ['major', '7', '7', [0, 4, 7, 10], '1 3 5 ♭7'],
  ['major', 'maj7', 'maj7', [0, 4, 7, 11], '1 3 5 7'],
  ['minor', '7', 'm7', [0, 3, 7, 10], '1 ♭3 5 ♭7'],
  ['minor', 'maj7', 'm(maj7)', [0, 3, 7, 11], '1 ♭3 5 7'],
  ['dim', 'none', '°', [0, 3, 6], '1 ♭3 ♭5'],
  ['dim', '7', '°7', [0, 3, 6, 9], '1 ♭3 ♭5 𝄫7'],
  ['aug', '7', '+7', [0, 4, 8, 10], '1 3 ♯5 ♭7'],
  ['sus4', 'none', 'sus4', [0, 5, 7], '1 4 5'],
  ['sus4', '7', '7sus4', [0, 5, 7, 10], '1 4 5 ♭7'],
  ['sus2', 'none', 'sus2', [0, 2, 7], '1 2 5'],
  ['power', 'none', '5', [0, 7], '1 5'],
  ['major', '6', '6', [0, 4, 7, 9], '1 3 5 6'],
  ['minor', '6', 'm6', [0, 3, 7, 9], '1 ♭3 5 6'],
  ['major', '9', '9', [0, 4, 7, 10, 14], '1 3 5 ♭7 9'],
  ['minor', '9', 'm9', [0, 3, 7, 10, 14], '1 ♭3 5 ♭7 9'],
  ['major', 'maj9', 'maj9', [0, 4, 7, 11, 14], '1 3 5 7 9'],
  ['major', '11', '11', [0, 4, 7, 10, 14, 17], '1 3 5 ♭7 9 11'],
  ['minor', '11', 'm11', [0, 3, 7, 10, 14, 17], '1 ♭3 5 ♭7 9 11'],
  ['major', '13', '13', [0, 4, 7, 10, 14, 21], '1 3 5 ♭7 9 13'],
  ['major', 'add9', 'add9', [0, 4, 7, 14], '1 3 5 9'],
  ['minor', 'add9', 'm(add9)', [0, 3, 7, 14], '1 ♭3 5 9'],
] as const)('%s + %s → %s', (base, ext, symbol, intervals, formula) => {
  expect(buildChord(base, ext)).toEqual({ symbol, intervals, formula });
});

it('greys out combinations that don\'t make sense', () => {
  expect(isAllowed('power', '7')).toBe(false);
  expect(isAllowed('power', 'none')).toBe(true);
  expect(isAllowed('dim', 'maj7')).toBe(false);
  expect(isAllowed('sus2', '11')).toBe(false);     // the 11 replaces the sus — use sus4
  expect(buildChord('power', '9')).toBeNull();
});

describe('alterations', () => {
  it('offers the classic ones', () => {
    expect(ALTERATIONS.map(a => a.label)).toEqual(['♭5', '♯5', '♭9', '♯9', '♯11']);
  });

  it.each([
    ['major', 'maj7', ['b5'], 'maj7♭5', [0, 4, 6, 11], '1 3 ♭5 7'],
    ['minor', '7', ['b5'], 'm7♭5', [0, 3, 6, 10], '1 ♭3 ♭5 ♭7'],
    ['major', '7', ['b5'], '7♭5', [0, 4, 6, 10], '1 3 ♭5 ♭7'],
    ['major', '7', ['s5'], '7♯5', [0, 4, 8, 10], '1 3 ♯5 ♭7'],
    ['major', '7', ['b9'], '7♭9', [0, 4, 7, 10, 13], '1 3 5 ♭7 ♭9'],
    ['major', '7', ['s9'], '7♯9', [0, 4, 7, 10, 15], '1 3 5 ♭7 ♯9'],
    ['major', '9', ['s11'], '9♯11', [0, 4, 7, 10, 14, 18], '1 3 5 ♭7 9 ♯11'],
    ['major', 'maj7', ['s11'], 'maj7♯11', [0, 4, 7, 11, 18], '1 3 5 7 ♯11'],
    ['major', '7', ['s9', 'b5'], '7♭5♯9', [0, 4, 6, 10, 15], '1 3 ♭5 ♭7 ♯9'],
  ] as const)('%s + %s + %s → %s', (base, ext, alts, symbol, intervals, formula) => {
    expect(buildChord(base, ext, [...alts])).toEqual({ symbol, intervals, formula });
  });

  it('only go on major and minor chords; ♭5 and ♯5 can\'t be combined', () => {
    expect(altAllowed('major', 'b5')).toBe(true);
    expect(altAllowed('dim', 'b5')).toBe(false);
    expect(altAllowed('power', 's9')).toBe(false);
    expect(buildChord('major', '7', ['b5', 's5'])).toBeNull();
  });
});

describe('chord types (root + type: the streamlined picker)', () => {
  it('lists the classic chord types in families', () => {
    expect(Array.from(new Set(CHORD_TYPES.map(t => t.group)))).toEqual(['Triads', 'Sixths', 'Sevenths', 'Extended', 'Altered']);
    expect(CHORD_TYPES.filter(t => t.group === 'Sevenths').map(t => t.symbol)).toEqual(['maj7', '7', 'm7', 'm(maj7)', 'm7♭5', '°7', '7sus4', '+7']);
    expect(new Set(CHORD_TYPES.map(t => t.id)).size).toBe(CHORD_TYPES.length);   // ids are unique
  });

  it.each([
    ['maj9', 'maj9', [0, 4, 7, 11, 14], '1 3 5 7 9'],
    ['maj7b5', 'maj7♭5', [0, 4, 6, 11], '1 3 ♭5 7'],
    ['m7b5', 'm7♭5', [0, 3, 6, 10], '1 ♭3 ♭5 ♭7'],
    ['dim7', '°7', [0, 3, 6, 9], '1 ♭3 ♭5 𝄫7'],
    ['major', '', [0, 4, 7], '1 3 5'],
  ] as const)('%s → %s', (id, symbol, intervals, formula) => {
    expect(chordType(id)).toMatchObject({ symbol, intervals, formula });
  });

  it('each type has a readable name for the picker', () => {
    expect(chordType('m7b5')?.name).toBe('half-diminished');
    expect(chordType('major')?.name).toBe('major');
  });
});
