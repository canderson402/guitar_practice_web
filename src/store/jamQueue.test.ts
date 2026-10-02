import { act } from '@testing-library/react';
import { useStore } from './useStore';
import { buildJamChord } from '../data/jamAlgorithms';
import { parentScale } from '../data/jamHarmony';
import { getChromaticPosition } from '../data/musicData';

const jam = () => useStore.getState().jam;
const names = () => jam().chordQueue.map(c => `${c.note}${c.symbol}`);

beforeEach(() => act(() => {
  useStore.getState().setSelectedNote('C');
  useStore.getState().setSelectedScale('Major (Ionian)');
}));

it('chords keep their real quality: vii° in C is B diminished, not B minor', () => {
  expect(buildJamChord('B', 'C', 'Major (Ionian)')).toMatchObject({ symbol: '°', roman: 'vii°', type: 'diminished' });
});

it('the default endless pattern plays real progressions in the key, starting on I', () => {
  expect(jam().algorithm).toBe('endless');
  act(() => { useStore.getState().setJamMode('infinite'); useStore.getState().rebuildJamQueue(); });
  expect(jam().chordQueue[0]).toMatchObject({ note: 'C', roman: 'I' });
  const scale = parentScale('C', 'Major (Ionian)').map(getChromaticPosition);
  for (let i = 0; i < 20; i++) act(() => useStore.getState().advanceJamChord());
  jam().chordQueue.forEach(c => expect(scale).toContain(getChromaticPosition(c.note)));
});

it('a chosen progression (scale degrees) plays in the current key and loops', () => {
  act(() => {
    useStore.getState().setSelectedNote('G');
    useStore.getState().setJamMode('preset');
    useStore.getState().setJamProgression('pop', [0, 4, 5, 3]);
    useStore.getState().rebuildJamQueue();
  });
  expect(jam().selectedPreset).toBe('pop');
  expect(names()).toEqual(['G', 'D', 'Em', 'C']);
  for (let i = 0; i < 4; i++) act(() => useStore.getState().advanceJamChord());
  expect(jam().currentChordIndex).toBe(0);
});
