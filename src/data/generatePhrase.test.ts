import { generatePhrase, KEY_NAMES } from './generatePhrase';
import { flattenMelody } from './famousMelodies';
import { RANGE_MIN, RANGE_MAX } from '../logic/noteReadingLogic';

describe('generatePhrase', () => {
  it('keeps every note within A1..G6 for all keys, clefs and densities', () => {
    for (const key of KEY_NAMES) {
      for (const clefTarget of ['treble', 'bass', 'mixed'] as const) {
        for (const notesPerBar of [4, 8] as const) {
          for (let i = 0; i < 20; i++) {
            const melody = generatePhrase({ bars: 4, key, notesPerBar, clefTarget });
            flattenMelody(melody).forEach((el) => {
              if (el.kind !== 'note') return;
              expect(el.midi).toBeGreaterThanOrEqual(RANGE_MIN);
              expect(el.midi).toBeLessThanOrEqual(RANGE_MAX);
            });
          }
        }
      }
    }
  });
});
