import {
  INTERVALS, PRESETS, RANGES, FIXED_ROOT, pickQuestion, questionNotes, toggleInterval, HOTKEYS, downSpan,
} from './intervalQuiz';

const seq = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

it('lists the 12 intervals from minor 2nd to octave', () => {
  expect(INTERVALS.map(i => i.semitones)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(INTERVALS[0]).toMatchObject({ short: 'm2', name: 'Minor 2nd' });
  expect(INTERVALS[5]).toMatchObject({ short: 'TT', name: 'Tritone' });
  expect(INTERVALS[11]).toMatchObject({ short: 'Oct', name: 'Octave' });
});

it('has Simple, Diatonic and All presets', () => {
  expect(PRESETS.simple).toEqual([4, 7, 12]);
  expect(PRESETS.diatonic).toEqual([2, 4, 5, 7, 9, 11, 12]);
  expect(PRESETS.all).toHaveLength(12);
});

it('keeps at least two intervals selected', () => {
  expect(toggleInterval([4, 7, 12], 7)).toEqual([4, 12]);
  expect(toggleInterval([4, 12], 4)).toEqual([4, 12]);
  expect(toggleInterval([4, 12], 7)).toEqual([4, 7, 12]);
});

it('picks only selected intervals, and both notes stay in the instrument range', () => {
  for (let k = 0; k < 200; k += 1) {
    for (const instrument of ['guitar', 'piano'] as const) {
      const q = pickQuestion({ intervals: [3, 12], direction: 'both', fixedRoot: false, instrument }, Math.random);
      expect([3, 12]).toContain(q.semitones);
      const [a, b] = questionNotes(q);
      for (const m of [a, b]) {
        expect(m).toBeGreaterThanOrEqual(RANGES[instrument].low);
        expect(m).toBeLessThanOrEqual(RANGES[instrument].high);
      }
      expect(['ascending', 'descending']).toContain(q.direction);
    }
  }
});

it('Down: the first note is R and the second is that interval note of R, below it', () => {
  // E5 down: M7 is the D# just below, m2 is the F an M7 below, P5 is the A a P4 below, octave is E4.
  expect(downSpan(11)).toBe(1);
  expect(downSpan(1)).toBe(11);
  expect(downSpan(7)).toBe(5);
  expect(downSpan(12)).toBe(12);
  const notes = (semitones: number) => questionNotes({ low: 76 - downSpan(semitones), semitones, direction: 'descending' });
  expect(notes(11)).toEqual([76, 75]);
  expect(notes(1)).toEqual([76, 65]);
  expect(notes(7)).toEqual([76, 71]);
  expect(notes(12)).toEqual([76, 64]);
});

it('plays ascending low→high, descending high→low, harmonic together', () => {
  expect(questionNotes({ low: 50, semitones: 7, direction: 'ascending' })).toEqual([50, 57]);
  expect(questionNotes({ low: 50, semitones: 7, direction: 'descending' })).toEqual([55, 50]);
  expect(questionNotes({ low: 50, semitones: 7, direction: 'harmonic' })).toEqual([50, 57]);
});

it('with a fixed root, the first note is always the fixed root', () => {
  const up = pickQuestion({ intervals: [5, 9], direction: 'ascending', fixedRoot: true, instrument: 'guitar' }, Math.random);
  expect(questionNotes(up)[0]).toBe(FIXED_ROOT);
  const down = pickQuestion({ intervals: [5, 9], direction: 'descending', fixedRoot: true, instrument: 'piano' }, Math.random);
  expect(questionNotes(down)[0]).toBe(FIXED_ROOT);
  const together = pickQuestion({ intervals: [5, 9], direction: 'harmonic', fixedRoot: true, instrument: 'piano' }, Math.random);
  expect(questionNotes(together)[0]).toBe(FIXED_ROOT);
});

it('does not ask the same question twice in a row', () => {
  const settings = { intervals: [4, 7], direction: 'ascending' as const, fixedRoot: true, instrument: 'guitar' as const };
  const first = pickQuestion(settings, seq(0));
  const second = pickQuestion(settings, seq(0, 0.99), first);
  expect(second.semitones).not.toBe(first.semitones);
});

it('has a hotkey for each of the 12 answers', () => {
  expect(HOTKEYS).toHaveLength(12);
  expect(new Set(HOTKEYS).size).toBe(12);
});
