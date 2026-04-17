import React, { memo } from 'react';
import { GrandStaff } from '../GrandStaff';
import type { Note, Spelling } from '../GrandStaff';
import { StaffPrompt as StaffPromptData, Label } from '../../logic/noteReadingLogic';

const labelToSpelling = (label: Label): Spelling => {
  if (label === 'B#' || label === 'Cb') return 'natural-C';
  if (label === 'E#' || label === 'Fb') return 'natural-F';
  if (label.includes('b')) return 'flat';
  if (label.includes('#')) return 'sharp';
  return 'sharp';
};

interface Props {
  prompt: StaffPromptData;
  trebleEnabled: boolean;
  bassEnabled: boolean;
}

const StaffPromptImpl: React.FC<Props> = ({ prompt, trebleEnabled, bassEnabled }) => {
  const note: Note = {
    midi: prompt.midi,
    spelling: labelToSpelling(prompt.spelling),
    duration: 'whole',
  };
  const clef: 'treble' | 'bass' | 'grand' =
    trebleEnabled && bassEnabled ? 'grand' : bassEnabled ? 'bass' : 'treble';
  return <GrandStaff notes={[note]} clef={clef} width={360} />;
};

export const StaffPrompt = memo(StaffPromptImpl);
