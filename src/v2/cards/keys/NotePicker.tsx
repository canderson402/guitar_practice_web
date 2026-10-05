import React from 'react';
import s from './NoteTrainer.module.css';
import { chromaticPosition } from '../../music/intervals';
import { ChipButton } from '../../ui';

/** The 12 notes in chromatic order, spelled the way the circle of fifths
 *  spells them (C, Db, D, Eb…). */
export const NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Pick one of the 12 notes — spelled as the circle does, or all sharps or
 *  all flats. */
export const NotePicker: React.FC<{ label: string; value: string; onPick(note: string): void; autoFocus?: boolean; accidental?: 'sharp' | 'flat' }> = ({ label, value, onPick, autoFocus, accidental }) => (
  <div role="radiogroup" aria-label={label} className={s.notes}>
    {(accidental === 'sharp' ? SHARP_NOTES : accidental === 'flat' ? FLAT_NOTES : NOTES).map(n => {
      const on = chromaticPosition(n) === chromaticPosition(value);
      return (
        <ChipButton key={n} tone="solid" role="radio" aria-checked={on} selected={on} className={s.noteOpt}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus && on} onClick={() => onPick(n)}>{n}</ChipButton>
      );
    })}
  </div>
);
