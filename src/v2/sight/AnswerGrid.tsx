import React from 'react';
import s from './SightReading.module.css';
import type { Answer, Label } from '../../logic/noteReadingLogic';

// Fretboard mode answers by note name (either spelling of a pitch counts).
const ROWS: Label[][] = [
  ['C#', 'D#', 'E#', 'F#', 'G#', 'A#'],
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  ['Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'],
];

export const AnswerGrid: React.FC<{
  wrongPresses: Answer[]; justPressedCorrect: Answer | null; locked: boolean; onPress(a: Answer): void;
}> = ({ wrongPresses, justPressedCorrect, locked, onPress }) => (
  <div className={s.grid}>
    {ROWS.map((row, i) => (
      <div key={i} className={s.gridRow}>
        {row.map(label => {
          const wrong = wrongPresses.includes(label);
          const right = justPressedCorrect === label;
          return (
            <button key={label} type="button" disabled={locked || wrong} onClick={() => onPress(label)}
              className={[s.nameBtn, wrong ? s.wrong : '', right ? s.right : ''].join(' ')}>
              {label}
            </button>
          );
        })}
      </div>
    ))}
  </div>
);
