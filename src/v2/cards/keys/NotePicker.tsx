import React from 'react';
import s from './NoteTrainer.module.css';
import { chromaticPosition } from '../../music/intervals';

/** The 12 notes in chromatic order, spelled the way the circle of fifths
 *  spells them (C, Db, D, Eb…). */
export const NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Pick one of the 12 notes. */
export const NotePicker: React.FC<{ label: string; value: string; onPick(note: string): void; autoFocus?: boolean }> = ({ label, value, onPick, autoFocus }) => (
  <div role="radiogroup" aria-label={label} className={s.notes}>
    {NOTES.map(n => {
      const on = chromaticPosition(n) === chromaticPosition(value);
      return (
        <button key={n} type="button" role="radio" aria-checked={on} className={[s.noteOpt, on ? s.noteOn : ''].join(' ')}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus && on} onClick={() => onPick(n)}>{n}</button>
      );
    })}
  </div>
);
