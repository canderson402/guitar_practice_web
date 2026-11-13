import { GUITAR_FRETS, guitarPositions, OPEN_STRINGS } from './notePositions';

const midiAt = (p: { string: number; fret: number }) => OPEN_STRINGS[p.string] + p.fret;

it('finds a fretboard position for each note, close together', () => {
  for (let first = 40; first <= 76; first += 1) {
    for (let semi = -12; semi <= 12; semi += 1) {
      const second = first + semi;
      if (semi === 0 || second < 40 || second > 76) continue;
      const [a, b] = guitarPositions(first, second);
      expect(midiAt(a)).toBe(first);
      expect(midiAt(b)).toBe(second);
      expect(a.fret).toBeLessThanOrEqual(GUITAR_FRETS);
      expect(b.fret).toBeLessThanOrEqual(GUITAR_FRETS);
      expect(Math.abs(a.fret - b.fret)).toBeLessThanOrEqual(5);
    }
  }
});

it('prefers a low, compact shape: a fifth from open A is on the A and D strings', () => {
  // Display order: 0 = high e … 5 = low E.
  expect(guitarPositions(45, 52)).toEqual([{ string: 4, fret: 0 }, { string: 3, fret: 2 }]);
});
