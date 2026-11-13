import { playGuitarNote, preloadGuitar, stopGuitarNotes } from '../../audio/guitar';
import { playPianoNote, preloadPiano, stopPianoNotes } from '../../audio/piano';
import { getAudioContext, resumeAudio } from '../../audio';
import { NOTE_GAP as GAP, questionNotes, type Instrument, type Question } from './intervalQuiz';

const STOP_ID = 'ear-training';
/** How long the last note rings, in seconds. */
const RING = 1.6;

export const preloadEarInstruments = (): void => {
  Promise.resolve(preloadGuitar()).catch(() => {});
  Promise.resolve(preloadPiano()).catch(() => {});
};

/** Cut every ear-training note now, including a second note not yet sounding. */
export const stopEarNotes = (): void => {
  stopGuitarNotes(STOP_ID);
  stopPianoNotes(STOP_ID);
};

/** Play the question's two notes, cutting anything still ringing first. */
export const playInterval = (instrument: Instrument, q: Question): void => {
  stopEarNotes();
  void resumeAudio();
  const play = instrument === 'guitar' ? playGuitarNote : playPianoNote;
  const start = getAudioContext().currentTime + 0.05;
  const [first, second] = questionNotes(q);
  const harmonic = q.direction === 'harmonic';
  // A melodic first note stops as the second starts, so the two never blur.
  void play(first, harmonic ? RING : GAP, start, STOP_ID);
  void play(second, RING, harmonic ? start : start + GAP, STOP_ID);
};
