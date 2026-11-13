import React, { useMemo } from 'react';
import { Fretboard } from '../../components/Fretboard';
import { PianoKeyboard } from '../../components/PianoKeyboard';
import { posKey, type DotInfo, type PosKey } from '../../components/Fretboard/types';
import { midiToPitch } from '../../data/pitch';
import { GUITAR_FRETS, STANDARD_TUNING, guitarPositions } from './notePositions';
import { RANGES, intervalInfo, type Instrument } from './intervalQuiz';

export type BoardLabels = 'notes' | 'intervals' | 'dots';

interface Props {
  instrument: Instrument;
  /** The interval's notes in playing order, or null for an empty board. */
  notes: [number, number] | null;
  /** The second note is sounding (melodic intervals light it a beat later). */
  secondLit: boolean;
  /** What the dots say: note names, R + the interval, or nothing. */
  labels?: BoardLabels;
}

const nameOf = (midi: number) => midiToPitch(midi).name;

/** The second note's interval label from the first, by note (B below C =
 *  M7); the same note in another octave is a unison (U). */
const degreeLabel = ([first, second]: [number, number]): string => {
  const d = (((second - first) % 12) + 12) % 12;
  return d === 0 ? 'U' : intervalInfo(d).short;
};

/** The interval's two notes on a guitar neck or a piano: the first note in
 *  the root color, the second in the highlight color. */
export const IntervalBoard: React.FC<Props> = ({ instrument, notes, secondLit, labels = 'notes' }) => {
  // The first note played is the root (R); the second carries its interval
  // from the root (for "Down", the same interval name in the octave below).
  const dotOf = (which: 0 | 1): DotInfo => {
    const isRoot = which === 0;
    const label = !notes || labels === 'dots' ? ''
      : labels === 'intervals' ? (isRoot ? 'R' : degreeLabel(notes))
      : nameOf(notes[which]);
    return { variant: isRoot ? 'root' : 'current', label };
  };

  const dots = useMemo(() => {
    const map = new Map<PosKey, DotInfo>();
    if (!notes || instrument !== 'guitar') return map;
    const [a, b] = guitarPositions(notes[0], notes[1]);
    map.set(posKey(a.string, a.fret), dotOf(0));
    if (secondLit) map.set(posKey(b.string, b.fret), dotOf(1));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, secondLit, instrument, labels]);

  if (instrument === 'guitar') {
    return <Fretboard strings={6} fretCount={GUITAR_FRETS} tuning={STANDARD_TUNING} dots={dots} />;
  }
  const dotFor = (midi: number): DotInfo | null => {
    if (!notes) return null;
    if (midi === notes[0]) return dotOf(0);
    if (midi === notes[1] && secondLit) return dotOf(1);
    return null;
  };
  return <PianoKeyboard low={RANGES.piano.low} high={RANGES.piano.high} dotFor={dotFor} />;
};
