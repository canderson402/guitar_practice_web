import { GROOVES, grooveBar, grooveHits, isCompound } from './drumGrooves';
import type { BarHit, DrumVoice, GrooveCtx } from './drumGrooves';

const ctx = (over: Partial<GrooveCtx> = {}): GrooveCtx =>
  ({ beatsPerBar: 4, barIndex: 1, compound: false, barsPerChord: 4, seed: 1, variety: 0, ...over });
// Bar 1 of a 4-bar phrase: no crash, no fill — the groove's backbone.
const plain = (id: string, over: Partial<GrooveCtx> = {}) => grooveBar(id, ctx(over));
const beatsWith = (hits: BarHit[], voice: DrumVoice, at = 0) =>
  Array.from(new Set(hits.filter(h => h.voice === voice && Math.abs(h.at - at) < 1e-9).map(h => h.beat))).sort((a, b) => a - b);
const gainOf = (hits: BarHit[], beat: number, voice: DrumVoice, at: number) =>
  hits.find(h => h.beat === beat && h.voice === voice && Math.abs(h.at - at) < 1e-9)?.gain ?? 0;
const signature = (hits: BarHit[]) => hits.map(h => `${h.beat}:${h.voice}@${h.at.toFixed(3)}`).sort().join(' ');

it('offers a handful of grooves', () => {
  expect(GROOVES.map(g => g.id)).toEqual(['kick', 'rock', 'four', 'halftime', 'shuffle', 'ballad']);
});

// Grooves with fills, crashes and variation (everything but the plain kick).
const FULL = GROOVES.filter(g => g.id !== 'kick');

it('kick only: a kick on every beat, the same every bar — no fills, crashes or variation', () => {
  [0, 1, 3, 7].forEach(barIndex => {
    const hits = grooveBar('kick', ctx({ barIndex, variety: 1 }));
    expect(hits.map(h => [h.beat, h.voice, h.at])).toEqual([[0, 'kick', 0], [1, 'kick', 0], [2, 'kick', 0], [3, 'kick', 0]]);
  });
  // 6/8: on the dotted quarters.
  expect(beatsWith(grooveBar('kick', ctx({ beatsPerBar: 6, compound: true })), 'kick')).toEqual([0, 3]);
});

it('every hit lands inside its beat and bar, with a sensible level', () => {
  GROOVES.forEach(g => [3, 4, 5, 7].forEach(n => [0, 1, 2, 3, 7].forEach(barIndex => [1, 2, 3].forEach(seed => {
    grooveBar(g.id, ctx({ beatsPerBar: n, barIndex, seed, variety: 1 })).forEach(h => {
      expect(h.beat).toBeGreaterThanOrEqual(0);
      expect(h.beat).toBeLessThan(n);
      expect(h.at).toBeGreaterThanOrEqual(0);
      expect(h.at).toBeLessThan(1);
      expect(h.gain).toBeGreaterThan(0);
      expect(h.gain).toBeLessThanOrEqual(1);
    });
  }))));
});

it('grooveHits is one beat of the bar', () => {
  const c = ctx({ variety: 1, barIndex: 3 });
  const all = grooveBar('rock', c);
  for (let b = 0; b < 4; b++) expect(grooveHits('rock', { ...c, beatInBar: b })).toEqual(all.filter(h => h.beat === b).map(({ beat, ...h }) => h));
});

describe('the backbone of each groove', () => {
  it('rock: kick on 1 and 3, snare on 2 and 4, eighth-note hats', () => {
    const hits = plain('rock');
    expect(beatsWith(hits, 'kick')).toEqual([0, 2]);
    expect(beatsWith(hits, 'snare')).toEqual([1, 3]);
    expect(beatsWith(hits, 'hatClosed', 0)).toEqual([0, 1, 2, 3]);
    expect(beatsWith(hits, 'hatClosed', 0.5)).toEqual([0, 1, 2, 3]);
  });

  it('four on the floor: kick every beat, open hats on the offbeats', () => {
    const hits = plain('four');
    expect(beatsWith(hits, 'kick')).toEqual([0, 1, 2, 3]);
    expect(beatsWith(hits, 'snare')).toEqual([1, 3]);
    expect(beatsWith(hits, 'hatOpen', 0.5)).toEqual([0, 1, 2, 3]);
  });

  it('half-time: one snare, in the middle of the bar', () => {
    expect(beatsWith(plain('halftime'), 'snare')).toEqual([2]);
    expect(beatsWith(plain('halftime'), 'kick')).toContain(0);
  });

  it('shuffle and ballad swing their eighths (the "and" is a triplet late)', () => {
    expect(plain('shuffle').some(h => h.voice === 'hatClosed' && Math.abs(h.at - 2 / 3) < 1e-9)).toBe(true);
    expect(plain('shuffle').some(h => Math.abs(h.at - 0.5) < 1e-9)).toBe(false);
    expect(beatsWith(plain('ballad'), 'ride')).toEqual([0, 1, 2, 3]);
    expect(beatsWith(plain('ballad'), 'ride', 2 / 3)).toEqual([1, 3]);
  });

  it('follows the time signature: a kick on the downbeat, never kick and snare together (except four on the floor)', () => {
    FULL.filter(g => g.id !== 'four').forEach(g => [3, 5, 7].forEach(n => [1, 2, 3].forEach(seed => {
      const hits = grooveBar(g.id, ctx({ beatsPerBar: n, seed, variety: 1 }));
      expect(beatsWith(hits, 'kick')).toContain(0);
      hits.filter(h => h.voice === 'kick').forEach(k =>
        expect(hits.some(h => h.voice === 'snare' && h.beat === k.beat && Math.abs(h.at - k.at) < 1e-9)).toBe(false));
    })));
  });

  it('compound meters (6/8, 12/8) feel in dotted quarters: kick on 1, snare on 4, a hat on every eighth', () => {
    expect(isCompound(6, 8)).toBe(true);
    expect(isCompound(3, 4)).toBe(false);
    expect(isCompound(3, 8)).toBe(false);
    const hits = plain('rock', { beatsPerBar: 6, compound: true });
    expect(beatsWith(hits, 'kick')).toEqual([0]);
    expect(beatsWith(hits, 'snare')).toEqual([3]);
    expect(beatsWith(hits, 'hatClosed')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(beatsWith(plain('rock', { beatsPerBar: 12, compound: true }), 'snare')).toEqual([3, 9]);
  });

  it('an unknown groove plays nothing', () => {
    expect(grooveBar('nope', ctx())).toEqual([]);
  });
});

describe('dynamics, like a drummer plays them', () => {
  it('hats lean on the beat and lighten on the "and", with beat 1 strongest', () => {
    ['rock', 'halftime'].forEach(id => {
      const hits = plain(id);
      expect(gainOf(hits, 1, 'hatClosed', 0) - gainOf(hits, 1, 'hatClosed', 0.5)).toBeGreaterThanOrEqual(0.1);
      expect(gainOf(hits, 0, 'hatClosed', 0)).toBeGreaterThan(gainOf(hits, 1, 'hatClosed', 0));
    });
  });

  it('backbeats are hit hard', () => {
    expect(gainOf(plain('rock'), 1, 'snare', 0)).toBeGreaterThanOrEqual(0.85);
  });
});

describe('chord changes', () => {
  const crashBars = (barsPerChord: number) => [0, 1, 2, 3, 4, 5, 6, 7].filter(barIndex =>
    grooveBar('rock', ctx({ barIndex, barsPerChord, variety: 1 })).some(h => h.voice === 'crash'));

  it('each new chord starts on a crash (with the kick), in place of the hat', () => {
    expect(crashBars(2)).toEqual([0, 2, 4, 6]);
    expect(crashBars(4)).toEqual([0, 4]);
    expect(crashBars(1)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const one = grooveBar('rock', ctx({ barIndex: 4 })).filter(h => h.beat === 0 && h.at === 0);
    expect(one.map(h => h.voice).sort()).toEqual(['crash', 'kick']);
  });

  it('the bar before a change lifts into it with an open hat on the last "and"', () => {
    const before = grooveBar('rock', ctx({ barIndex: 3 }));
    expect(beatsWith(before, 'hatOpen', 0.5)).toEqual([3]);
    expect(beatsWith(grooveBar('rock', ctx({ barIndex: 2 })), 'hatOpen', 0.5)).toEqual([]);
  });

  it('no fills: the groove never drops out, and there are no tom runs', () => {
    FULL.forEach(g => [0, 1, 2, 3, 7].forEach(barIndex => [1, 2, 3].forEach(seed => {
      const hits = grooveBar(g.id, ctx({ barIndex, seed, variety: 1 }));
      hits.forEach(h => expect(['kick', 'snare', 'hatClosed', 'hatOpen', 'ride', 'crash']).toContain(h.voice));
      for (let b = 0; b < 4; b++) expect(hits.some(h => h.beat === b && ['hatClosed', 'hatOpen', 'ride', 'crash'].includes(h.voice))).toBe(true);
    })));
  });
});

describe('variation from bar to bar', () => {
  it('bars differ (an extra kick, a ghost note, an open hat) but keep the backbone', () => {
    const bars = [1, 2, 5, 6, 9, 10, 13, 14].map(barIndex => grooveBar('rock', ctx({ barIndex, variety: 1, seed: 7 })));
    expect(new Set(bars.map(signature)).size).toBeGreaterThan(2);
    bars.forEach(hits => {
      expect(beatsWith(hits, 'kick')).toEqual(expect.arrayContaining([0, 2]));
      expect(beatsWith(hits, 'snare')).toEqual(expect.arrayContaining([1, 3]));
    });
  });

  it('is repeatable: the same bar of the same run plays the same way', () => {
    const c = ctx({ barIndex: 6, variety: 1, seed: 42 });
    expect(grooveBar('shuffle', c)).toEqual(grooveBar('shuffle', c));
  });

  it('variety 0 plays the plain groove every bar', () => {
    expect(signature(plain('rock', { barIndex: 1 }))).toBe(signature(plain('rock', { barIndex: 6 })));
  });
});
