import type React from 'react';
import type { ColSpan } from './grid';
import { MetronomeFace } from './metronome/MetronomeFace';
import { MetronomeSheet } from './metronome/MetronomeSheet';
import { ScaleFace } from './scale/ScaleFace';
import { ScaleSheet } from './scale/ScaleSheet';
import { FretboardFace } from './fretboard/FretboardFace';
import { FretboardSheet } from './fretboard/FretboardSheet';
import { TimerFace } from './timer/TimerFace';
import { TimerSheet } from './timer/TimerSheet';
import { CircleFace } from './circle/CircleFace';
import { CircleSheet } from './circle/CircleSheet';
import { KeysFace } from './keys/KeysFace';
import { KeysSheet } from './keys/KeysSheet';
import { ChordsFace } from './chords/ChordsFace';
import { ChordsSheet } from './chords/ChordsSheet';
import { JamFace } from './jam/JamFace';
import { JamSheet } from './jam/JamSheet';
import { HarmonyFace } from './harmony/HarmonyFace';
import { HarmonySheet } from './harmony/HarmonySheet';

export interface CardDef {
  id: string;
  title: string;
  description: string;
  size: { colSpan: ColSpan; rowSpan: number };
  Face: React.FC;
  Sheet?: React.FC;
}

// Cards are added here as each one passes its review (spec §7.3).
export const CARDS: CardDef[] = [
  {
    id: 'metronome',
    title: 'Metronome',
    description: 'Beat, tempo and click, driven by the shared clock.',
    size: { colSpan: 3, rowSpan: 6 },
    Face: MetronomeFace,
    Sheet: MetronomeSheet,
  },
  {
    id: 'timer',
    title: 'Timer',
    description: 'Session timer, counting up or down.',
    size: { colSpan: 3, rowSpan: 6 },
    Face: TimerFace,
    Sheet: TimerSheet,
  },
  {
    id: 'scale',
    title: 'Scale',
    description: 'The notes of the current key, one at a time, with auto-advance.',
    size: { colSpan: 3, rowSpan: 6 },
    Face: ScaleFace,
    Sheet: ScaleSheet,
  },
  {
    id: 'circle-of-fifths',
    title: 'Circle of fifths',
    description: 'The 12 keys in circle order, with the current key\'s chords marked.',
    size: { colSpan: 3, rowSpan: 6 },
    Face: CircleFace,
    Sheet: CircleSheet,
  },
  {
    id: 'note-trainer',
    title: 'Note Trainer',
    description: 'Cycles the key through all 12 — by fifths, fourths or at random — so you practice in every key.',
    size: { colSpan: 3, rowSpan: 6 },
    Face: KeysFace,
    Sheet: KeysSheet,
  },
  {
    id: 'chord',
    title: 'Chords',
    description: 'The chords of the current key; pick one to see it on the fretboard.',
    size: { colSpan: 3, rowSpan: 6 },
    Face: ChordsFace,
    Sheet: ChordsSheet,
  },
  {
    id: 'harmony',
    title: 'Harmony',
    description: 'Place notes on the neck and see their harmony in the key — numbered in play order.',
    size: { colSpan: 12, rowSpan: 8 },
    Face: HarmonyFace,
    Sheet: HarmonySheet,
  },
  {
    id: 'jam',
    title: 'Jam',
    description: 'A pad plays through a chord progression in the current key, on the shared tempo.',
    size: { colSpan: 12, rowSpan: 6 },
    Face: JamFace,
    Sheet: JamSheet,
  },
  {
    id: 'fretboard',
    title: 'Fretboard',
    description: 'The whole neck (or a piano) showing the key, scale and current note.',
    size: { colSpan: 12, rowSpan: 9 },
    Face: FretboardFace,
    Sheet: FretboardSheet,
  },
];

export const getCard = (id: string): CardDef | undefined => CARDS.find(c => c.id === id);
