jest.mock('../../audio/guitar', () => ({ playGuitarNote: jest.fn(), preloadGuitar: jest.fn(), stopGuitarNotes: jest.fn() }));
jest.mock('../../audio/piano', () => ({ playPianoNote: jest.fn(), preloadPiano: jest.fn(), stopPianoNotes: jest.fn() }));
jest.mock('../../audio', () => ({ resumeAudio: jest.fn(), getAudioContext: () => ({ currentTime: 10 }) }));
// eslint-disable-next-line import/first
import { playInterval } from './playback';
// eslint-disable-next-line import/first
import { playGuitarNote, stopGuitarNotes } from '../../audio/guitar';
// eslint-disable-next-line import/first
import { stopPianoNotes } from '../../audio/piano';

it('cuts any ringing notes before it plays, and tags its notes so they can be cut', () => {
  const order: string[] = [];
  (stopGuitarNotes as jest.Mock).mockImplementation(() => order.push('stop'));
  (stopPianoNotes as jest.Mock).mockImplementation(() => order.push('stop'));
  (playGuitarNote as jest.Mock).mockImplementation(() => order.push('play'));
  playInterval('guitar', { low: 50, semitones: 7, direction: 'ascending' });
  expect(order).toEqual(['stop', 'stop', 'play', 'play']);
  const calls = (playGuitarNote as jest.Mock).mock.calls;
  expect(calls.map(c => c[0])).toEqual([50, 57]);
  expect(calls[0][3]).toBe(calls[1][3]);
  expect(stopGuitarNotes).toHaveBeenCalledWith(calls[0][3]);
  // Melodic: the first note stops as the second starts.
  expect(calls[0][2] + calls[0][1]).toBeCloseTo(calls[1][2]);
});
