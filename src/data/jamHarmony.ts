// ---------------------------------------------------------------------------
// Jam harmony — the musical side of the Jam card:
//
//   - diatonic chords built by stacking thirds in the key, so every chord has
//     its real quality (vii° stays diminished, V gets a dominant 7th)
//   - color: triads, 7ths, or lush (rootless 3-5-7-9 voicings over the bass)
//   - voice leading: each chord takes the voicing closest to the last one,
//     holding shared notes, in a fixed mid range — so changes sound like one
//     player moving, not blocks swapped
//   - a library of real progressions, and an endless mode that strings them
//     together (each played twice, always starting home)
//   - bass patterns, from one held note per chord to a walking line
//
// Pure: no React, store or audio.
// ---------------------------------------------------------------------------

import { getChromaticPosition, getScaleNotes, chordTypes } from './musicData';
import type { scales } from './musicData';
import type { JamChord } from './jamAlgorithms';

type ScaleName = keyof typeof scales;
export type Color = 'triads' | '7ths' | 'lush';
export type KeyMode = 'major' | 'minor';

const pc = (note: string) => getChromaticPosition(note);
const interval = (from: string, to: string) => (pc(to) - pc(from) + 12) % 12;

/** The 7-note scale chords are built from. Pentatonic, blues and other
 *  non-7-note scales use their parent major or minor scale. */
export const parentScale = (root: string, scale: ScaleName): string[] => {
  const notes = getScaleNotes(root, scale);
  if (notes.length === 7) return notes;
  const minor = notes.some(n => interval(root, n) === 3);
  return getScaleNotes(root, minor ? 'Aeolian (Natural Minor)' : 'Major (Ionian)');
};

/** Is the key's home chord major or minor? */
export const keyMode = (root: string, scale: ScaleName): KeyMode => {
  const s = parentScale(root, scale);
  return interval(s[0], s[2]) === 3 ? 'minor' : 'major';
};

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** The chord on scale degree `degree` (0 = I), with its stacked intervals. */
export const diatonicChord = (root: string, scale: ScaleName, degree: number): JamChord => {
  const s = parentScale(root, scale);
  const d = ((degree % 7) + 7) % 7;
  const note = s[d];
  const at = (step: number) => interval(note, s[(d + step) % 7]);
  const third = at(2), fifth = at(4), seventh = at(6), ninth = at(1) + 12;
  const type = third === 4 ? (fifth === 8 ? 'augmented' : 'major') : (fifth === 6 ? 'diminished' : 'minor');
  const numeral = third === 4 ? NUMERALS[d] : NUMERALS[d].toLowerCase();
  const roman = numeral + (type === 'diminished' ? '°' : type === 'augmented' ? '+' : '');
  const rootMidi = 48 + pc(note);
  return {
    note, type, symbol: chordTypes[type].symbol, roman,
    midi: [rootMidi, rootMidi + third, rootMidi + fifth],
    third, fifth, seventh, ninth,
  };
};

/** Fill in stacked intervals for a chord that isn't from the key (the key
 *  drills walk all 12 roots): its quality's usual 7th and a major 9th. */
export const withIntervals = (chord: JamChord): JamChord => {
  if (chord.third !== undefined) return chord;
  const base = chordTypes[chord.type as keyof typeof chordTypes]?.intervals ?? [0, 4, 7];
  const third = base[1] ?? 4, fifth = base[2] ?? 7;
  return { ...chord, third, fifth, seventh: third === 4 && fifth === 7 ? 11 : 10, ninth: 14 };
};

/** The chord's notes for a color, as intervals above its root. Lush drops
 *  the root (the bass has it) for 3-5-7-9 — unless the 9th would be a harsh
 *  ♭9, when it keeps the root and stops at the 7th. */
export const chordTones = (chord: JamChord, color: Color): number[] => {
  const c = withIntervals(chord);
  const triad = [0, c.third!, c.fifth!];
  if (color === 'triads') return triad;
  if (color === 'lush' && c.ninth === 14) return [c.third!, c.fifth!, c.seventh!, 14];
  return [...triad, c.seventh!];
};

/** The chord's name for a color: C, Cmaj7, Cmaj9, Dm7, G9, Bm7♭5… */
export const colorSymbol = (chord: JamChord, color: Color): string => {
  const c = withIntervals(chord);
  if (color === 'triads') return chord.symbol;
  const nine = color === 'lush' && c.ninth === 14;
  if (chord.type === 'diminished') return c.seventh === 9 ? '°7' : 'm7♭5';
  if (chord.type === 'augmented') return c.seventh === 11 ? '+maj7' : '+7';
  if (chord.type === 'minor') return c.seventh === 11 ? 'm(maj7)' : nine ? 'm9' : 'm7';
  return c.seventh === 11 ? (nine ? 'maj9' : 'maj7') : nine ? '9' : '7';
};

// ---- Voice leading ----

const LOW = 52, HIGH = 79, CENTER = 64;

/** Distance between two voicings: each note to its nearest partner, both ways. */
const movement = (a: number[], b: number[]): number => {
  if (a.length === b.length) {
    const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q);
    return x.reduce((sum, n, i) => sum + Math.abs(n - y[i]), 0);
  }
  const near = (n: number, set: number[]) => Math.min(...set.map(m => Math.abs(m - n)));
  return a.reduce((s, n) => s + near(n, b), 0) + b.reduce((s, n) => s + near(n, a), 0);
};

/** Voice the chord (`tones` above `rootPc`) as close as possible to `prev`:
 *  every inversion, in close position, within a mid range. A gentle pull to
 *  the middle stops a long progression drifting up or down. */
export const voiceLead = (prev: number[] | null, rootPc: number, tones: number[]): number[] => {
  const pcs = tones.map(t => (rootPc + t) % 12);
  const candidates: number[][] = [];
  for (let k = 0; k < pcs.length; k++) {
    const order = [...pcs.slice(k), ...pcs.slice(0, k)];
    for (let bottom = LOW; bottom < LOW + 12; bottom++) {
      if (bottom % 12 !== order[0]) continue;
      const v = [bottom];
      order.slice(1).forEach(p => { let n = v[v.length - 1] + 1; while (n % 12 !== p) n++; v.push(n); });
      if (v[v.length - 1] <= HIGH) candidates.push(v);
      const up = v.map(n => n + 12);
      if (up[up.length - 1] <= HIGH) candidates.push(up);
    }
  }
  const mean = (v: number[]) => v.reduce((s, n) => s + n, 0) / v.length;
  const cost = (v: number[]) => (prev ? movement(v, prev) : 0) + 0.35 * Math.abs(mean(v) - CENTER);
  return candidates.reduce((best, v) => (cost(v) < cost(best) ? v : best));
};

/** The bass note for a root: the octave nearest the last bass note, kept
 *  between G1 and D3. */
export const bassFor = (prev: number | null, rootPc: number): number => {
  const target = prev ?? 40;
  let best = 0, bestDist = Infinity;
  for (let n = 31; n <= 50; n++) {
    if (n % 12 !== rootPc) continue;
    const d = Math.abs(n - target);
    if (d < bestDist) { best = n; bestDist = d; }
  }
  return best;
};

// ---- Progressions ----

export interface Progression {
  id: string;
  name: string;
  mode: KeyMode;
  /** Scale degrees, 0 = I. */
  degrees: number[];
}

export const PROGRESSIONS: Progression[] = [
  { id: 'pop', name: 'Pop (I–V–vi–IV)', mode: 'major', degrees: [0, 4, 5, 3] },
  { id: 'fifties', name: '50s (I–vi–IV–V)', mode: 'major', degrees: [0, 5, 3, 4] },
  { id: 'axis-vi', name: 'Sad pop (vi–IV–I–V)', mode: 'major', degrees: [5, 3, 0, 4] },
  { id: 'anthem', name: 'Anthem (I–IV–vi–V)', mode: 'major', degrees: [0, 3, 5, 4] },
  { id: 'rock', name: 'Rock (I–IV–V–IV)', mode: 'major', degrees: [0, 3, 4, 3] },
  { id: 'ballad', name: 'Ballad (I–iii–IV–V)', mode: 'major', degrees: [0, 2, 3, 4] },
  { id: 'soul', name: 'Soul (I–IV–ii–V)', mode: 'major', degrees: [0, 3, 1, 4] },
  { id: 'canon', name: 'Canon (I–V–vi–iii–IV–I–IV–V)', mode: 'major', degrees: [0, 4, 5, 2, 3, 0, 3, 4] },
  { id: 'jazz', name: 'Jazz (ii–V–I)', mode: 'major', degrees: [1, 4, 0, 0] },
  { id: 'turnaround', name: 'Turnaround (I–vi–ii–V)', mode: 'major', degrees: [0, 5, 1, 4] },
  { id: 'epic', name: 'Epic (i–VI–III–VII)', mode: 'minor', degrees: [0, 5, 2, 6] },
  { id: 'andalusian', name: 'Andalusian (i–VII–VI–v)', mode: 'minor', degrees: [0, 6, 5, 4] },
  { id: 'minor-pop', name: 'Minor pop (i–iv–VII–III)', mode: 'minor', degrees: [0, 3, 6, 2] },
  { id: 'minor-rock', name: 'Minor rock (i–VII–VI–VII)', mode: 'minor', degrees: [0, 6, 5, 6] },
  { id: 'minor-blues', name: 'Minor groove (i–iv–i–v)', mode: 'minor', degrees: [0, 3, 0, 4] },
  { id: 'minor-jazz', name: 'Minor ii–v–i', mode: 'minor', degrees: [1, 4, 0, 0] },
];

/** A progression's chords in the current key. */
export const progressionQueue = (degrees: number[], root: string, scale: ScaleName): JamChord[] =>
  degrees.map(d => diatonicChord(root, scale, d));

export interface EndlessState {
  /** Degrees still to play in the current phrase. */
  pending?: number[];
  /** The progression playing now (so the next one differs). */
  current?: string;
}

/** Endless mode: the next degree. Plays a library progression for the key's
 *  mode twice, then moves to another. The very first phrase starts on I, so
 *  a jam always begins at home (the caller plays that first I itself). */
export const nextEndless = (mode: KeyMode, state: EndlessState, rand: () => number = Math.random): { degree: number; state: EndlessState } => {
  if (state.pending?.length) {
    const [degree, ...rest] = state.pending;
    return { degree, state: { ...state, pending: rest } };
  }
  const first = state.current === undefined;
  const pool = PROGRESSIONS.filter(p => p.mode === mode && p.id !== state.current && (!first || p.degrees[0] === 0));
  const pick = pool[Math.floor(rand() * pool.length) % pool.length];
  const phrase = [...pick.degrees, ...pick.degrees];
  // The caller already played the first phrase's opening I.
  const queue = first ? phrase.slice(1) : phrase;
  const [degree, ...rest] = queue;
  return { degree, state: { pending: rest, current: pick.id } };
};

// ---- Bass line ----

export const BASS_PATTERNS = [
  { id: 'held', name: 'Held' },
  { id: 'bar', name: 'Root on 1' },
  { id: 'quarters', name: 'Quarter notes' },
  { id: 'eighths', name: 'Eighth notes' },
  { id: 'rootFifth', name: 'Root & fifth' },
  { id: 'walking', name: 'Walking' },
] as const;
export type BassPattern = typeof BASS_PATTERNS[number]['id'];

export interface BassEvent {
  beat: number;
  /** Offset into the beat (0.5 = the "and"). */
  at: number;
  kind: 'root' | 'fifth' | 'approach';
  /** How many beats it lasts (to the next note, the bar line, or — held —
   *  the end of the chord). */
  beats: number;
}

export interface BassCtx {
  beatsPerBar: number;
  compound: boolean;
  /** Which bar of the chord this is (0 = the chord's first bar). */
  barInChord: number;
  barsPerChord: number;
}

type Hit = Omit<BassEvent, 'beats'>;
const withLengths = (hits: Hit[], n: number): BassEvent[] =>
  hits.map((h, i) => {
    const next = hits[i + 1];
    return { ...h, beats: (next ? next.beat + next.at : n) - (h.beat + h.at) };
  });

/** One bar of bass for a pattern:
 *   held — one long root per chord · root on 1 — the root each bar ·
 *   quarter / eighth notes — a steady root pulse (dotted quarters / eighths
 *   in compound time) · root & fifth — root on 1, the fifth mid-bar ·
 *   walking — root & fifth, plus a passing note into the next chord on the
 *   last beat of the chord's last bar. */
export const bassPlan = (pattern: BassPattern, ctx: BassCtx): BassEvent[] => {
  const { beatsPerBar: n, compound, barInChord, barsPerChord } = ctx;
  const root = (beat: number, at = 0): Hit => ({ beat, at, kind: 'root' });
  switch (pattern) {
    case 'held':
      return barInChord === 0 ? [{ ...root(0), beats: n * barsPerChord }] : [];
    case 'bar':
      return [{ ...root(0), beats: n }];
    case 'quarters': {
      const step = compound ? 3 : 1;
      return withLengths(Array.from({ length: Math.ceil(n / step) }, (_, i) => root(i * step)), n);
    }
    case 'eighths':
      return withLengths(compound
        ? Array.from({ length: n }, (_, b) => root(b))
        : Array.from({ length: n * 2 }, (_, i) => root(Math.floor(i / 2), (i % 2) / 2)), n);
    case 'rootFifth':
    case 'walking': {
      const hits: Hit[] = [root(0)];
      if (compound) for (let b = 3; b < n; b += 6) hits.push({ beat: b, at: 0, kind: 'fifth' });
      else if (n >= 4) hits.push({ beat: Math.floor(n / 2), at: 0, kind: 'fifth' });
      const lastBar = barInChord === barsPerChord - 1;
      if (pattern === 'walking' && lastBar && n >= 3 && !hits.some(h => h.beat === n - 1)) hits.push({ beat: n - 1, at: 0, kind: 'approach' });
      return withLengths(hits, n);
    }
    default:
      return [];
  }
};

/** A passing note into `to`: the nearest scale note just below it when the
 *  line is rising, just above it when falling (the fifth below if the root
 *  doesn't change). */
export const approachNote = (from: number, to: number, scalePcs: number[]): number => {
  const inScale = (n: number) => scalePcs.includes(((n % 12) + 12) % 12);
  if (to === from) return to - 5;
  const step = to > from ? -1 : 1;
  for (let n = to + step; Math.abs(n - to) <= 2; n += step) if (inScale(n)) return n;
  return to + step;
};
