import {
  diatonicChord, chordTones, colorSymbol, voiceLead, bassFor, PROGRESSIONS, progressionQueue,
  nextEndless, parentScale, keyMode,
} from './jamHarmony';
import type { Color } from './jamHarmony';

const C = (d: number) => diatonicChord('C', 'Major (Ionian)', d);
const Am = (d: number) => diatonicChord('A', 'Aeolian (Natural Minor)', d);
const pc = (m: number) => ((m % 12) + 12) % 12;

describe('diatonic chords (stacked thirds in the key)', () => {
  it('C major: I ii iii IV V vi vii°, with the right qualities', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(d => C(d).roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect([0, 1, 2, 3, 4, 5, 6].map(d => `${C(d).note}${C(d).symbol}`)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
  });

  it('A minor: i ii° III iv v VI VII', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(d => Am(d).roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  });

  it('knows its 7th: V is dominant, I is major 7, vii is half-diminished', () => {
    expect(C(4).seventh).toBe(10);
    expect(C(0).seventh).toBe(11);
    expect(C(6)).toMatchObject({ third: 3, fifth: 6, seventh: 10 });
  });

  it('pentatonic and blues keys harmonize with their parent major or minor scale', () => {
    expect(parentScale('A', 'Minor Pentatonic' as any)).toHaveLength(7);
    expect(keyMode('A', 'Minor Pentatonic' as any)).toBe('minor');
    expect(keyMode('C', 'Major (Ionian)')).toBe('major');
  });
});

describe('color', () => {
  it('triads, 7ths, or lush (rootless 3-5-7-9 over the bass)', () => {
    expect(chordTones(C(0), 'triads')).toEqual([0, 4, 7]);
    expect(chordTones(C(0), '7ths')).toEqual([0, 4, 7, 11]);
    expect(chordTones(C(0), 'lush')).toEqual([4, 7, 11, 14]);
    expect(chordTones(C(4), '7ths')).toEqual([0, 4, 7, 10]);
  });

  it('lush skips a harsh ♭9 (iii, vii in major) and keeps the root instead', () => {
    expect(chordTones(C(2), 'lush')).toEqual([0, 3, 7, 10]);
    expect(chordTones(C(6), 'lush')).toEqual([0, 3, 6, 10]);
  });

  it('names the chord for the color', () => {
    const names = (color: Color) => [0, 1, 4, 6].map(d => `${C(d).note}${colorSymbol(C(d), color)}`);
    expect(names('triads')).toEqual(['C', 'Dm', 'G', 'B°']);
    expect(names('7ths')).toEqual(['Cmaj7', 'Dm7', 'G7', 'Bm7♭5']);
    expect(names('lush')).toEqual(['Cmaj9', 'Dm9', 'G9', 'Bm7♭5']);
  });
});

describe('voice leading', () => {
  it('moves each voice as little as possible: C → F holds C and steps E→F, G→A', () => {
    const c = voiceLead(null, 0, [0, 4, 7]);
    const f = voiceLead(c, 5, [0, 4, 7]);
    const moves = f.map((n, i) => Math.abs(n - c[i]));
    expect(Math.max(...moves)).toBeLessThanOrEqual(2);
    expect(f.filter(n => c.includes(n))).toHaveLength(1);   // the shared C stays put
  });

  it('plays the right notes, in a mid range, and never drifts over a long progression', () => {
    let prev: number[] | null = null;
    const roots = [0, 5, 7, 9, 2, 7, 0, 11, 4, 9, 5, 7, 0, 3, 8, 10];
    roots.forEach(r => {
      const tones = [0, 4, 7, 11];
      const v = voiceLead(prev, r, tones);
      expect(v.map(pc).sort((a, b) => a - b)).toEqual(tones.map(t => (r + t) % 12).sort((a, b) => a - b));
      v.forEach(n => { expect(n).toBeGreaterThanOrEqual(52); expect(n).toBeLessThanOrEqual(79); });
      prev = v;
    });
  });

  it('the bass takes the nearest octave: C → B steps down, not up a 7th', () => {
    const c = bassFor(null, 0);
    expect(bassFor(c, 11)).toBe(c - 1);
    [0, 3, 5, 7, 9, 11].forEach(r => { const b = bassFor(c, r); expect(b).toBeGreaterThanOrEqual(31); expect(b).toBeLessThanOrEqual(50); });
  });
});

describe('progressions', () => {
  it('a library of real progressions, for major and minor keys', () => {
    expect(PROGRESSIONS.length).toBeGreaterThanOrEqual(10);
    expect(PROGRESSIONS.find(p => p.id === 'pop')).toMatchObject({ mode: 'major', degrees: [0, 4, 5, 3] });
    expect(PROGRESSIONS.some(p => p.mode === 'minor')).toBe(true);
    PROGRESSIONS.forEach(p => p.degrees.forEach(d => { expect(d).toBeGreaterThanOrEqual(0); expect(d).toBeLessThan(7); }));
  });

  it('builds a progression in the current key', () => {
    expect(progressionQueue([0, 4, 5, 3], 'G', 'Major (Ionian)').map(c => `${c.note}${c.symbol}`)).toEqual(['G', 'D', 'Em', 'C']);
  });

  it('endless mode plays real progressions, each twice, starting home — never random walks', () => {
    let state = {};
    const degrees: number[] = [0];
    for (let i = 0; i < 40; i++) {
      const r = nextEndless('major', state, () => (i * 0.37) % 1);
      degrees.push(r.degree);
      state = r.state;
    }
    // Starts on I, and the first phrase is a library progression played twice.
    const first = PROGRESSIONS.find(p => p.mode === 'major' && p.degrees.every((d, i) => degrees[i] === d))!;
    expect(first).toBeDefined();
    expect(degrees.slice(first.degrees.length, first.degrees.length * 2)).toEqual(first.degrees);
  });
});

describe('bass line', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { bassPlan, approachNote, BASS_PATTERNS } = require('./jamHarmony');

  const ctx = (over = {}) => ({ beatsPerBar: 4, compound: false, barInChord: 0, barsPerChord: 1, ...over });
  const shape = (events: any[]) => events.map(e => `${e.beat}${e.at ? '+' : ''}:${e.kind}:${e.beats}`);

  it('offers tame patterns first, walking last', () => {
    expect(BASS_PATTERNS.map((p: any) => p.id)).toEqual(['held', 'bar', 'quarters', 'eighths', 'rootFifth', 'walking']);
  });

  it('held: one long root per chord, on its first bar only', () => {
    expect(shape(bassPlan('held', ctx({ barsPerChord: 2 })))).toEqual(['0:root:8']);
    expect(bassPlan('held', ctx({ barsPerChord: 2, barInChord: 1 }))).toEqual([]);
  });

  it('root on 1: the root each bar', () => {
    expect(shape(bassPlan('bar', ctx()))).toEqual(['0:root:4']);
  });

  it('quarter and eighth notes: a steady pulse on the root (dotted quarters / eighths in 6/8)', () => {
    expect(shape(bassPlan('quarters', ctx()))).toEqual(['0:root:1', '1:root:1', '2:root:1', '3:root:1']);
    expect(bassPlan('eighths', ctx())).toHaveLength(8);
    expect(bassPlan('eighths', ctx()).filter((e: any) => e.at === 0.5)).toHaveLength(4);
    expect(shape(bassPlan('quarters', ctx({ beatsPerBar: 6, compound: true })))).toEqual(['0:root:3', '3:root:3']);
    expect(bassPlan('eighths', ctx({ beatsPerBar: 6, compound: true }))).toHaveLength(6);
  });

  it('root & fifth, and walking (with a passing note into the next chord)', () => {
    expect(shape(bassPlan('rootFifth', ctx()))).toEqual(['0:root:2', '2:fifth:2']);
    expect(shape(bassPlan('walking', ctx()))).toEqual(['0:root:2', '2:fifth:1', '3:approach:1']);
    expect(shape(bassPlan('walking', ctx({ barsPerChord: 2 })))).toEqual(['0:root:2', '2:fifth:2']);
    expect(shape(bassPlan('walking', ctx({ beatsPerBar: 3 })))).toEqual(['0:root:2', '2:approach:1']);
    expect(shape(bassPlan('walking', ctx({ beatsPerBar: 6, compound: true })))).toEqual(['0:root:3', '3:fifth:2', '5:approach:1']);
  });

  it('the passing note is the scale step next to the target, on the side it comes from', () => {
    const cMajor = [0, 2, 4, 5, 7, 9, 11];
    expect(approachNote(36, 41, cMajor)).toBe(40);   // C up to F: through E
    expect(approachNote(43, 41, cMajor)).toBe(43);   // G down to F: G is already the step above
    expect(approachNote(36, 33, cMajor)).toBe(35);   // C down to A: through B
  });
});
