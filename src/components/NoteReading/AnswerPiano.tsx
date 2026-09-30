import React, { memo, useMemo } from 'react';
import { isBlackKey, midiToPitch } from '../../data/pitch';
import { Answer, MIDDLE_C, RANGE_MIN, RANGE_MAX } from '../../logic/noteReadingLogic';
import '../PianoKeyboard/PianoKeyboard.css';

// Keyboard spanning A1..G6 for answering prompts, with a notch above middle
// C for orientation. Each key answers with its exact
// MIDI number, so the octave matters (middle C ≠ the C above it). Keys are
// unlabeled unless `showLabels` is on — reading the note is the exercise.

interface AnswerPianoProps {
  wrongPresses: Answer[];
  answerState: 'waiting' | 'correct';
  justPressedCorrect: Answer | null;
  /** Show each key's name + octave (learning aid). */
  showLabels: boolean;
  onPress: (midi: number) => void;
  /** Where middle C is marked: a notch above the keys (default), or a
   *  labeled ▲ below them. */
  middleCMarker?: 'top' | 'below';
}

const AnswerPianoImpl: React.FC<AnswerPianoProps> = ({
  wrongPresses,
  answerState,
  justPressedCorrect,
  showLabels,
  onPress,
  middleCMarker = 'top',
}) => {
  const locked = answerState === 'correct';

  const { whiteKeys, blackKeys } = useMemo(() => {
    const white: number[] = [];
    const black: Array<{ midi: number; whiteBefore: number }> = [];
    for (let midi = RANGE_MIN; midi <= RANGE_MAX; midi++) {
      if (isBlackKey(midi)) black.push({ midi, whiteBefore: white.length });
      else white.push(midi);
    }
    return { whiteKeys: white, blackKeys: black };
  }, []);

  const renderKey = (midi: number, black: boolean) => {
    const isWrong = wrongPresses.includes(midi);
    const isCorrect = justPressedCorrect === midi;
    const classes = [
      'piano-key',
      black ? 'black' : 'white',
      isWrong ? 'answer-wrong' : '',
      isCorrect ? 'answer-correct' : '',
    ].filter(Boolean).join(' ');
    const pitch = midiToPitch(midi);
    const name = `${pitch.name}${pitch.octave}`;
    return (
      <button
        type="button"
        className={classes}
        disabled={locked || isWrong}
        onClick={() => onPress(midi)}
        aria-label={name}
      >
        {showLabels && <span className="piano-key-name">{name}</span>}
      </button>
    );
  };

  return (
    <div className="piano-root answer-piano">
      {/* Mirrors the white-key row cell-for-cell so the notch lands exactly
          over the center of middle C. */}
      {middleCMarker === 'top' && (
        <div className="answer-piano-notch-row" aria-hidden="true">
          {whiteKeys.map(midi => (
            <span key={midi} className="answer-piano-notch-cell">
              {midi === MIDDLE_C && <span className="answer-piano-notch" data-testid="middle-c-notch" />}
            </span>
          ))}
        </div>
      )}
      <div className="piano-keyboard">
        <div className="piano-white-row">
          {whiteKeys.map(midi => (
            <React.Fragment key={midi}>{renderKey(midi, false)}</React.Fragment>
          ))}
        </div>
        <div className="piano-black-row">
          {blackKeys.map(k => (
            <div
              key={k.midi}
              className="piano-black-position"
              style={{
                left: `${((k.whiteBefore - 0.5) / whiteKeys.length) * 100}%`,
                width: `${(1 / whiteKeys.length) * 100}%`,
              }}
            >
              {renderKey(k.midi, true)}
            </div>
          ))}
        </div>
      </div>
      {middleCMarker === 'below' && (
        // Same cell-for-cell layout as the white keys, so ▲ sits under middle C.
        <div className="answer-piano-marker-row" aria-hidden="true">
          {whiteKeys.map(midi => (
            <span key={midi} className="answer-piano-marker-cell">
              {midi === MIDDLE_C && (
                <span className="answer-piano-marker" data-testid="middle-c-marker"><span>▲</span>Middle C</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const AnswerPiano = memo(AnswerPianoImpl);
