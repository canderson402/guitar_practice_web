import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { validateAnswer, Answer } from '../../logic/noteReadingLogic';
import { countPlayableNotes, durationToSeconds, flattenMelody } from '../../data/famousMelodies';
import { playPianoNote } from '../../audio/piano';
import { playGuitarNote } from '../../audio/guitar';
import { resumeAudio, getAudioContext } from '../../audio';

const PHRASE_BPM = 100;

/** Same game flow as v1 sight reading: on a correct answer play the note (or
 *  the whole phrase after its last note), then advance to the next prompt.
 *  Scoring itself lives in the shared store (pressNoteReadingAnswer). */
export const useAnswerHandler = (): ((answer: Answer) => void) => {
  const nextPrompt = useStore(s => s.nextNoteReadingPrompt);
  const press = useStore(s => s.pressNoteReadingAnswer);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const advanceAfter = useCallback((ms: number) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; nextPrompt(); }, ms);
  }, [nextPrompt]);

  return useCallback((answer: Answer) => {
    const { prompt, answerState } = useStore.getState().noteReading;
    if (!prompt || answerState === 'correct') return;
    if (validateAnswer(prompt, answer) === 'correct') {
      void resumeAudio();
      const melody = prompt.kind === 'phrase' ? prompt.melody : null;
      if (melody && prompt.kind === 'phrase' && prompt.noteIndex === countPlayableNotes(melody) - 1) {
        const start = getAudioContext().currentTime + 0.05;
        let cursor = 0;
        flattenMelody(melody).forEach(el => {
          const sec = durationToSeconds(el.duration, PHRASE_BPM);
          if (el.kind === 'note') void playPianoNote(el.midi, Math.max(sec * 0.95, 0.2), start + cursor);
          cursor += sec;
        });
        advanceAfter(Math.round(cursor * 1000 + 1500));
      } else {
        void (prompt.kind === 'fretboard' ? playGuitarNote : playPianoNote)(prompt.midi, 1.2);
        advanceAfter(700);
      }
    }
    press(answer);
  }, [press, advanceAfter]);
};
