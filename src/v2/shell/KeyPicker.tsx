import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Picker } from '../ui';
import { useStore } from '../../store/useStore';
import { scales } from '../../data/musicData';
import s from './KeyPicker.module.css';

export const CIRCLE_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
export const MAJOR = 'Major (Ionian)';
export const MINOR = 'Aeolian (Natural Minor)';

// The major scale's seven modes, in mode order; everything else is listed
// after them so major and minor are always seen as part of one family.
export const MAJOR_MODES = ['Major (Ionian)', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian (Natural Minor)', 'Locrian'];
export const OTHER_SCALES = Object.keys(scales).filter(name => !MAJOR_MODES.includes(name));

// Display names: mode first, familiar name in parentheses — like
// "Aeolian (Natural Minor)". Stored names are unchanged.
const DISPLAY_NAME: Record<string, string> = { 'Major (Ionian)': 'Ionian (Major)' };
export const scaleDisplayName = (name: string): string => DISPLAY_NAME[name] ?? name;

/** Short display name: the mode name, like every other scale ("Ionian",
 *  "Aeolian", "Dorian"…). */
export const scaleShortName = (scale: string | null): string =>
  scale === MAJOR ? 'Ionian' : scale === MINOR ? 'Aeolian' : (scale ?? '');

/** Edits the shared key + scale. Used by the dock's key pop-up and by cards'
 *  settings sheets — all views onto the same state. Every scale is listed in
 *  one set so major and minor are seen in context as modes, not as a
 *  separate switch. */
export const KeyPicker: React.FC = () => {
  const { note, scale, setSelectedNote, setSelectedScale } = useStore(useShallow(st => ({
    note: st.note.selectedNote, scale: st.note.selectedScale,
    setSelectedNote: st.setSelectedNote, setSelectedScale: st.setSelectedScale,
  })));
  return (
    <>
      <Picker label="Key" value={note ?? 'C'} onChange={setSelectedNote}
        options={CIRCLE_KEYS.map(k => ({ value: k, label: k }))} />
      <span className={s.group}>Modes</span>
      <Picker label="Modes" value={scale ?? MAJOR} onChange={setSelectedScale} columns={2}
        options={MAJOR_MODES.map(name => ({ value: name, label: scaleDisplayName(name) }))} />
      <span className={s.group}>Other</span>
      <Picker label="Other" value={scale ?? MAJOR} onChange={setSelectedScale} columns={2}
        options={OTHER_SCALES.map(name => ({ value: name, label: scaleDisplayName(name) }))} />
    </>
  );
};
