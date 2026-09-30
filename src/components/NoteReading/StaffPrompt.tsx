import React, { memo } from 'react';
import { GrandStaff } from '../GrandStaff';
import type { Note, Spelling } from '../GrandStaff';
import {
  StaffPrompt as StaffPromptData,
  Label,
  noteNameWithOctave,
} from '../../logic/noteReadingLogic';

const labelToSpelling = (label: Label): Spelling => {
  if (label === 'E#' || label === 'Fb') return 'natural-F';
  if (label.includes('b')) return 'flat';
  if (label.includes('#')) return 'sharp';
  return 'sharp';
};

interface Props {
  prompt: StaffPromptData;
  trebleEnabled: boolean;
  bassEnabled: boolean;
  showLabels: boolean;
  /** Passed through to GrandStaff (v2 draws larger, with ledger-line room). */
  scale?: number;
  padding?: { top?: number; bottom?: number };
  /** Unscaled staff width. Default 360. */
  width?: number;
}

const StaffPromptImpl: React.FC<Props> = ({
  prompt, trebleEnabled, bassEnabled, showLabels, scale, padding, width = 360,
}) => {
  const note: Note = {
    midi: prompt.midi,
    spelling: labelToSpelling(prompt.spelling),
    duration: 'whole',
    label: showLabels ? noteNameWithOctave(prompt.spelling, prompt.midi) : undefined,
  };
  const clef: 'treble' | 'bass' | 'grand' =
    trebleEnabled && bassEnabled ? 'grand' : bassEnabled ? 'bass' : 'treble';
  return <GrandStaff notes={[note]} clef={clef} width={width} scale={scale} padding={padding} />;
};

export const StaffPrompt = memo(StaffPromptImpl);
