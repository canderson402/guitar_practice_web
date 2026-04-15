import React from 'react';
import { useStore } from '../store/useStore';
import { Fretboard } from './Fretboard';
import { FretboardProps } from './Fretboard/types';
import { PianoKeyboard } from './PianoKeyboard';

// ---------------------------------------------------------------------------
// FretboardOrPiano — view-agnostic wrapper. Reads viewMode from the store
// and renders either the Fretboard or the PianoKeyboard with identical props.
//
// Consumers (GuitarNeck, HarmonyMaker) don't need to know which view is
// active — they build their DotInfo map off (stringIndex, fret) state and
// hand it over. The view primitive handles the rest.
// ---------------------------------------------------------------------------

export const FretboardOrPiano: React.FC<FretboardProps> = (props) => {
  const viewMode = useStore(s => s.viewMode);
  if (viewMode === 'piano') {
    return <PianoKeyboard {...props} />;
  }
  return <Fretboard {...props} />;
};
