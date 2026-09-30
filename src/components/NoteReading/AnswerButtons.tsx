import React, { memo } from 'react';
import { Button } from '../../ui';
import { Answer, Label } from '../../logic/noteReadingLogic';

interface AnswerButtonsProps {
  wrongPresses: Answer[];
  answerState: 'waiting' | 'correct';
  justPressedCorrect: Answer | null;
  onPress: (label: Label) => void;
}

const ROWS: Label[][] = [
  ['C#', 'D#', 'E#', 'F#', 'G#', 'A#'],
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  ['Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'],
];

const AnswerButtonsImpl: React.FC<AnswerButtonsProps> = ({
  wrongPresses,
  answerState,
  justPressedCorrect,
  onPress,
}) => {
  const locked = answerState === 'correct';

  return (
    <div className="answer-buttons-grid">
      {ROWS.map((row, ri) => (
        <div className="answer-buttons-row" key={ri}>
          {row.map(label => {
            const isWrong = wrongPresses.includes(label);
            const isCorrect = justPressedCorrect === label;
            const disabled = locked || isWrong;
            const variant = isCorrect
              ? 'primary'
              : isWrong
                ? 'danger'
                : 'outline';
            return (
              <Button
                key={label}
                variant={variant}
                size="md"
                disabled={disabled}
                onClick={() => onPress(label)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const AnswerButtons = memo(AnswerButtonsImpl);
