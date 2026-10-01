// ---------------------------------------------------------------------------
// Chord builder: a base quality plus an optional extension → any classic
// chord, as intervals (semitones above the root; 14/17/21 = 9/11/13), its
// symbol (m7, 7sus4, m(maj7), °7…) and its formula ("1 ♭3 5 ♭7").
// ---------------------------------------------------------------------------

export type BaseId = 'major' | 'minor' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'power';
export type ExtId = 'none' | '6' | '7' | 'maj7' | '9' | 'maj9' | '11' | '13' | 'add9';
export type AltId = 'b5' | 's5' | 'b9' | 's9' | 's11';

/** Altered tones (maj7♭5, m7♭5, 7♯9…): each replaces its natural tone, or is
 *  added if the chord doesn't have it. */
export const ALTERATIONS: Array<{ id: AltId; label: string; natural: number; altered: number }> = [
  { id: 'b5', label: '♭5', natural: 7, altered: 6 },
  { id: 's5', label: '♯5', natural: 7, altered: 8 },
  { id: 'b9', label: '♭9', natural: 14, altered: 13 },
  { id: 's9', label: '♯9', natural: 14, altered: 15 },
  { id: 's11', label: '♯11', natural: 17, altered: 18 },
];

/** Alterations go on major and minor chords (dim, aug, sus and power chords
 *  already define their own 5ths). */
export const altAllowed = (base: BaseId, _alt: AltId): boolean => base === 'major' || base === 'minor';

export const BASES: Array<{ id: BaseId; label: string; intervals: number[]; symbol: string }> = [
  { id: 'major', label: 'Major', intervals: [0, 4, 7], symbol: '' },
  { id: 'minor', label: 'Minor', intervals: [0, 3, 7], symbol: 'm' },
  { id: 'dim', label: 'Dim', intervals: [0, 3, 6], symbol: '°' },
  { id: 'aug', label: 'Aug', intervals: [0, 4, 8], symbol: '+' },
  { id: 'sus2', label: 'Sus2', intervals: [0, 2, 7], symbol: 'sus2' },
  { id: 'sus4', label: 'Sus4', intervals: [0, 5, 7], symbol: 'sus4' },
  { id: 'power', label: '5', intervals: [0, 7], symbol: '5' },
];

export const EXTENSIONS: Array<{ id: ExtId; label: string; adds: number[] }> = [
  { id: 'none', label: '—', adds: [] },
  { id: '6', label: '6', adds: [9] },
  { id: '7', label: '7', adds: [10] },
  { id: 'maj7', label: 'maj7', adds: [11] },
  { id: '9', label: '9', adds: [10, 14] },
  { id: 'maj9', label: 'maj9', adds: [11, 14] },
  { id: '11', label: '11', adds: [10, 14, 17] },
  { id: '13', label: '13', adds: [10, 14, 21] },
  { id: 'add9', label: 'add9', adds: [14] },
];

// Which extensions make sense on each base (major and minor take them all).
const ALLOWED: Partial<Record<BaseId, ExtId[]>> = {
  dim: ['none', '7'],
  aug: ['none', '7', 'maj7'],
  sus2: ['none', '7'],
  sus4: ['none', '7', '9'],
  power: ['none'],
};

export const isAllowed = (base: BaseId, ext: ExtId): boolean => (ALLOWED[base] ?? EXTENSIONS.map(e => e.id)).includes(ext);

const symbolFor = (base: BaseId, ext: ExtId): string => {
  const b = BASES.find(x => x.id === base)!.symbol;
  if (ext === 'none') return b;
  if (base === 'sus2' || base === 'sus4') return `${ext}${b}`;               // 7sus4, 9sus4
  if (base === 'minor' && (ext === 'maj7' || ext === 'maj9' || ext === 'add9')) return `m(${ext})`;
  if (base === 'aug' && ext === 'maj7') return '+maj7';
  return `${b}${ext}`;                                                        // m7, °7, +7, 9 …
};

const DEGREE: Record<number, string> = {
  0: '1', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7',
  13: '♭9', 14: '9', 15: '♯9', 17: '11', 18: '♯11', 21: '13',
};

/** How a chord tone is spelled (degree name), given the whole chord: 9
 *  semitones is a 𝄫7 in a diminished 7th (♭3 + ♭5, no other 7th), a 6 otherwise. */
export const degreeLabel = (interval: number, intervals: number[]): string => {
  if (interval === 9 && intervals.includes(3) && intervals.includes(6) && !intervals.includes(10) && !intervals.includes(11)) return '𝄫7';
  return DEGREE[interval] ?? String(interval);
};

/** The chord for a base + extension (+ alterations), or null if that
 *  combination doesn't make sense (see `isAllowed`, `altAllowed`). */
export const buildChord = (
  base: BaseId, ext: ExtId, alts: AltId[] = [],
): { symbol: string; intervals: number[]; formula: string } | null => {
  if (!isAllowed(base, ext) || alts.some(a => !altAllowed(base, a)) || (alts.includes('b5') && alts.includes('s5'))) return null;
  const b = BASES.find(x => x.id === base)!;
  // A diminished 7th is a double-flat 7 (9 semitones), not a ♭7.
  const adds = base === 'dim' && ext === '7' ? [9] : EXTENSIONS.find(e => e.id === ext)!.adds;
  let intervals = [...b.intervals, ...adds];
  const ordered = ALTERATIONS.filter(a => alts.includes(a.id));
  ordered.forEach(a => {
    intervals = intervals.includes(a.natural) ? intervals.map(i => (i === a.natural ? a.altered : i)) : [...intervals, a.altered];
  });
  intervals.sort((x, y) => x - y);
  const formula = intervals.map(i => degreeLabel(i, intervals)).join(' ');
  return { symbol: symbolFor(base, ext) + ordered.map(a => a.label).join(''), intervals, formula };
};

// ---- Chord types: the picker's vocabulary (root + type) ----

type Spec = { id: string; group: string; name: string; base: BaseId; ext?: ExtId; alts?: AltId[] };
const SPECS: Spec[] = [
  { id: 'major', group: 'Triads', name: 'major', base: 'major' },
  { id: 'minor', group: 'Triads', name: 'minor', base: 'minor' },
  { id: 'dim', group: 'Triads', name: 'diminished', base: 'dim' },
  { id: 'aug', group: 'Triads', name: 'augmented', base: 'aug' },
  { id: 'sus2', group: 'Triads', name: 'suspended 2nd', base: 'sus2' },
  { id: 'sus4', group: 'Triads', name: 'suspended 4th', base: 'sus4' },
  { id: 'power', group: 'Triads', name: 'power chord', base: 'power' },
  { id: '6', group: 'Sixths', name: 'major 6th', base: 'major', ext: '6' },
  { id: 'm6', group: 'Sixths', name: 'minor 6th', base: 'minor', ext: '6' },
  { id: 'maj7', group: 'Sevenths', name: 'major 7th', base: 'major', ext: 'maj7' },
  { id: '7', group: 'Sevenths', name: 'dominant 7th', base: 'major', ext: '7' },
  { id: 'm7', group: 'Sevenths', name: 'minor 7th', base: 'minor', ext: '7' },
  { id: 'mmaj7', group: 'Sevenths', name: 'minor-major 7th', base: 'minor', ext: 'maj7' },
  { id: 'm7b5', group: 'Sevenths', name: 'half-diminished', base: 'minor', ext: '7', alts: ['b5'] },
  { id: 'dim7', group: 'Sevenths', name: 'diminished 7th', base: 'dim', ext: '7' },
  { id: '7sus4', group: 'Sevenths', name: '7th, suspended 4th', base: 'sus4', ext: '7' },
  { id: 'aug7', group: 'Sevenths', name: 'augmented 7th', base: 'aug', ext: '7' },
  { id: 'add9', group: 'Extended', name: 'add 9', base: 'major', ext: 'add9' },
  { id: 'madd9', group: 'Extended', name: 'minor add 9', base: 'minor', ext: 'add9' },
  { id: '9', group: 'Extended', name: 'dominant 9th', base: 'major', ext: '9' },
  { id: 'maj9', group: 'Extended', name: 'major 9th', base: 'major', ext: 'maj9' },
  { id: 'm9', group: 'Extended', name: 'minor 9th', base: 'minor', ext: '9' },
  { id: '9sus4', group: 'Extended', name: '9th, suspended 4th', base: 'sus4', ext: '9' },
  { id: '11', group: 'Extended', name: 'dominant 11th', base: 'major', ext: '11' },
  { id: 'm11', group: 'Extended', name: 'minor 11th', base: 'minor', ext: '11' },
  { id: '13', group: 'Extended', name: 'dominant 13th', base: 'major', ext: '13' },
  { id: '7b5', group: 'Altered', name: '7th, flat 5', base: 'major', ext: '7', alts: ['b5'] },
  { id: '7s5', group: 'Altered', name: '7th, sharp 5', base: 'major', ext: '7', alts: ['s5'] },
  { id: '7b9', group: 'Altered', name: '7th, flat 9', base: 'major', ext: '7', alts: ['b9'] },
  { id: '7s9', group: 'Altered', name: '7th, sharp 9', base: 'major', ext: '7', alts: ['s9'] },
  { id: 'maj7b5', group: 'Altered', name: 'major 7th, flat 5', base: 'major', ext: 'maj7', alts: ['b5'] },
  { id: 'maj7s11', group: 'Altered', name: 'major 7th, sharp 11', base: 'major', ext: 'maj7', alts: ['s11'] },
  { id: '9s11', group: 'Altered', name: '9th, sharp 11', base: 'major', ext: '9', alts: ['s11'] },
];

export interface ChordType { id: string; group: string; name: string; symbol: string; intervals: number[]; formula: string }

/** Every chord type the picker offers, in families (Triads, Sixths, Sevenths,
 *  Extended, Altered). Notes and names come from `buildChord`. */
export const CHORD_TYPES: ChordType[] = SPECS.map(sp => {
  const c = buildChord(sp.base, sp.ext ?? 'none', sp.alts ?? [])!;
  return { id: sp.id, group: sp.group, name: sp.name, ...c };
});

export const chordType = (id: string): ChordType | undefined => CHORD_TYPES.find(t => t.id === id);
