import React, { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { Button, ToggleButtonGroup, Select } from '../../ui';
import { KEY_NAMES } from '../../data/generatePhrase';
import { StaffPrompt } from './StaffPrompt';
import { FretboardPrompt } from './FretboardPrompt';
import { PhrasePrompt } from './PhrasePrompt';
import { AnswerButtons } from './AnswerButtons';
import { playPianoNote, preloadPiano } from '../../audio/piano';
import { playGuitarNote, preloadGuitar } from '../../audio/guitar';
import { resumeAudio } from '../../audio';
import { getAudioContext } from '../../audio/engine';
import { validateAnswer, Label } from '../../logic/noteReadingLogic';
import {
  countPlayableNotes,
  durationToSeconds,
  flattenMelody,
} from '../../data/famousMelodies';
import './NoteReading.css';

const PHRASE_BPM = 100;

export const NoteReading: React.FC = () => {
  const noteReading = useStore(s => s.noteReading);
  const setNoteReadingMode = useStore(s => s.setNoteReadingMode);
  const setNoteReadingFretCount = useStore(s => s.setNoteReadingFretCount);
  const setNoteReadingPhraseConfig = useStore(s => s.setNoteReadingPhraseConfig);
  const nextNoteReadingPrompt = useStore(s => s.nextNoteReadingPrompt);
  const pressNoteReadingAnswer = useStore(s => s.pressNoteReadingAnswer);
  const resetNoteReadingScore = useStore(s => s.resetNoteReadingScore);

  const {
    mode, fretCount,
    phraseBars, phraseKey, phraseNotesPerBar,
    trebleEnabled, bassEnabled,
    prompt, answerState, wrongPresses, justPressedCorrect, score,
  } = noteReading;

  useEffect(() => {
    void preloadPiano();
    void preloadGuitar();
  }, []);

  useEffect(() => {
    if (!prompt) nextNoteReadingPrompt();
  }, [prompt, nextNoteReadingPrompt]);

  const advanceTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const handlePress = useCallback(
    (label: Label) => {
      if (!prompt || answerState === 'correct') return;
      const result = validateAnswer(prompt, label);

      if (result === 'correct') {
        void resumeAudio();
        const isPhrase = prompt.kind === 'phrase';
        const melody = isPhrase ? prompt.melody : null;
        const isLastPhraseNote =
          isPhrase && melody ? prompt.noteIndex === countPlayableNotes(melody) - 1 : false;

        if (isLastPhraseNote && melody) {
          const ctx = getAudioContext();
          const start = ctx.currentTime + 0.05;
          let cursor = 0;
          flattenMelody(melody).forEach((el) => {
            const sec = durationToSeconds(el.duration, PHRASE_BPM);
            if (el.kind === 'note') {
              void playPianoNote(el.midi, Math.max(sec * 0.95, 0.2), start + cursor);
            }
            cursor += sec;
          });
          const advanceMs = Math.round(cursor * 1000 + 1500);
          if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = window.setTimeout(() => {
            nextNoteReadingPrompt();
            advanceTimerRef.current = null;
          }, advanceMs);
        } else {
          const playSingle = prompt.kind === 'fretboard' ? playGuitarNote : playPianoNote;
          void playSingle(prompt.midi, 1.2);
          if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current);
          advanceTimerRef.current = window.setTimeout(() => {
            nextNoteReadingPrompt();
            advanceTimerRef.current = null;
          }, 700);
        }
      }

      pressNoteReadingAnswer(label);
    },
    [prompt, answerState, mode, pressNoteReadingAnswer, nextNoteReadingPrompt],
  );

  return (
    <div className="note-reading">
      <div className="note-reading-top">
        <div className="score-panel">
          <span>Score: {score.correct}/{score.total}</span>
          <span>Streak: {score.streak}</span>
          <Button variant="ghost" size="sm" onClick={resetNoteReadingScore}>
            Reset
          </Button>
        </div>
        <div className="note-reading-controls">
          {mode === 'fretboard' && (
            <ToggleButtonGroup label="Fret count" layout="segmented">
              <Button
                variant="ghost"
                size="sm"
                active={fretCount === 12}
                onClick={() => setNoteReadingFretCount(12)}
              >12</Button>
              <Button
                variant="ghost"
                size="sm"
                active={fretCount === 24}
                onClick={() => setNoteReadingFretCount(24)}
              >24</Button>
            </ToggleButtonGroup>
          )}
          {mode === 'phrase' && (
            <>
              <Select
                size="sm"
                label="Key"
                value={phraseKey ?? ''}
                onChange={(e) =>
                  setNoteReadingPhraseConfig({ phraseKey: e.target.value === '' ? null : e.target.value })
                }
                options={[
                  { value: '', label: 'Random' },
                  ...KEY_NAMES.map((k) => ({ value: k, label: `${k} major` })),
                ]}
              />
              <ToggleButtonGroup label="Bars" layout="segmented">
                {([1, 2, 3, 4] as const).map(b => (
                  <Button
                    key={b}
                    variant="ghost"
                    size="sm"
                    active={phraseBars === b}
                    onClick={() => setNoteReadingPhraseConfig({ phraseBars: b })}
                  >{b}</Button>
                ))}
              </ToggleButtonGroup>
              <ToggleButtonGroup label="Notes/bar" layout="segmented">
                {([4, 8] as const).map(n => (
                  <Button
                    key={n}
                    variant="ghost"
                    size="sm"
                    active={phraseNotesPerBar === n}
                    onClick={() => setNoteReadingPhraseConfig({ phraseNotesPerBar: n })}
                  >{n}</Button>
                ))}
              </ToggleButtonGroup>
            </>
          )}
          {(mode === 'staff' || mode === 'phrase') && (
            <ToggleButtonGroup label="Clefs" layout="segmented">
              <Button
                variant="ghost"
                size="sm"
                active={trebleEnabled}
                onClick={() =>
                  setNoteReadingPhraseConfig({ trebleEnabled: !trebleEnabled })
                }
              >Treble</Button>
              <Button
                variant="ghost"
                size="sm"
                active={bassEnabled}
                onClick={() =>
                  setNoteReadingPhraseConfig({ bassEnabled: !bassEnabled })
                }
              >Bass</Button>
            </ToggleButtonGroup>
          )}
          <ToggleButtonGroup label="Mode" layout="segmented">
            <Button
              variant="ghost"
              size="sm"
              active={mode === 'staff'}
              onClick={() => setNoteReadingMode('staff')}
            >Staff</Button>
            <Button
              variant="ghost"
              size="sm"
              active={mode === 'fretboard'}
              onClick={() => setNoteReadingMode('fretboard')}
            >Fretboard</Button>
            <Button
              variant="ghost"
              size="sm"
              active={mode === 'phrase'}
              onClick={() => setNoteReadingMode('phrase')}
            >Arpeggio</Button>
          </ToggleButtonGroup>
        </div>
      </div>

      <div className="prompt-area">
        {prompt?.kind === 'staff' && (
          <StaffPrompt
            prompt={prompt}
            trebleEnabled={trebleEnabled}
            bassEnabled={bassEnabled}
          />
        )}
        {prompt?.kind === 'fretboard' && (
          <FretboardPrompt
            prompt={prompt}
            answerState={answerState}
            justPressedCorrect={justPressedCorrect}
          />
        )}
        {prompt?.kind === 'phrase' && (
          <PhrasePrompt
            prompt={prompt}
            answerState={answerState}
            trebleEnabled={trebleEnabled}
            bassEnabled={bassEnabled}
          />
        )}
      </div>

      <AnswerButtons
        wrongPresses={wrongPresses}
        answerState={answerState}
        justPressedCorrect={justPressedCorrect}
        onPress={handlePress}
      />
    </div>
  );
};
