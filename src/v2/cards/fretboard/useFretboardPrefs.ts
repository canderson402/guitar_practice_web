import { useCardPref } from '../../state/useCardPref';
import type { DotLabels } from './buildDots';

export const useFretboardPrefs = () => {
  const [frets, setFrets] = useCardPref<number>('fretboard', 'frets', 24);
  const [labels, setLabels] = useCardPref<DotLabels>('fretboard', 'labels', 'notes');
  const [showRoot, setShowRoot] = useCardPref<boolean>('fretboard', 'showRoot', true);
  const [showScale, setShowScale] = useCardPref<boolean>('fretboard', 'showScale', true);
  const [showSelected, setShowSelected] = useCardPref<boolean>('fretboard', 'showSelected', true);
  const [playNotes, setPlayNotes] = useCardPref<boolean>('fretboard', 'playNotes', false);
  const [shapes, setShapes] = useCardPref<boolean>('fretboard', 'shapes', false);
  const [positions, setPositions] = useCardPref<number[]>('fretboard', 'positions', [1]);
  const [positionColors, setPositionColors] = useCardPref<boolean>('fretboard', 'positionColors', true);
  return { frets, setFrets, labels, setLabels, showRoot, setShowRoot, showScale, setShowScale, showSelected, setShowSelected, playNotes, setPlayNotes, shapes, setShapes, positions, setPositions, positionColors, setPositionColors };
};
