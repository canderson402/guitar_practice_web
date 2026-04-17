import type { Label } from '../logic/noteReadingLogic';
import type { Duration } from '../components/GrandStaff';
import type { Melody, MelodyElement } from './famousMelodies';

// Diatonic major key definitions. `tonicMidi` is the tonic within C4–B4 so
// arpeggios stay in a sight-readable treble-clef range.
type MajorKey = {
  name: string;
  tonicMidi: number;
  degreeLabels: [Label, Label, Label, Label, Label, Label, Label];
};

const MAJOR_KEYS: MajorKey[] = [
  { name: 'C',  tonicMidi: 60, degreeLabels: ['C',  'D',  'E',  'F',  'G',  'A',  'B' ] },
  { name: 'G',  tonicMidi: 67, degreeLabels: ['G',  'A',  'B',  'C',  'D',  'E',  'F#'] },
  { name: 'D',  tonicMidi: 62, degreeLabels: ['D',  'E',  'F#', 'G',  'A',  'B',  'C#'] },
  { name: 'A',  tonicMidi: 69, degreeLabels: ['A',  'B',  'C#', 'D',  'E',  'F#', 'G#'] },
  { name: 'E',  tonicMidi: 64, degreeLabels: ['E',  'F#', 'G#', 'A',  'B',  'C#', 'D#'] },
  { name: 'F',  tonicMidi: 65, degreeLabels: ['F',  'G',  'A',  'Bb', 'C',  'D',  'E' ] },
  { name: 'Bb', tonicMidi: 70, degreeLabels: ['Bb', 'C',  'D',  'Eb', 'F',  'G',  'A' ] },
  { name: 'Eb', tonicMidi: 63, degreeLabels: ['Eb', 'F',  'G',  'Ab', 'Bb', 'C',  'D' ] },
  { name: 'Ab', tonicMidi: 68, degreeLabels: ['Ab', 'Bb', 'C',  'Db', 'Eb', 'F',  'G' ] },
];

const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

const ROMAN: Record<number, string> = {
  1: 'I', 2: 'ii', 3: 'iii', 4: 'IV', 5: 'V', 6: 'vi', 7: 'vii°',
};

/** All major-key names supported by the generator. `null` means random. */
export const KEY_NAMES: readonly string[] = MAJOR_KEYS.map((k) => k.name);

export type NotesPerBar = 4 | 8;

/** Which clef range(s) to target. `mixed` picks per-measure. */
export type ClefTarget = 'treble' | 'bass' | 'mixed';

export interface PhraseConfig {
  bars: number;
  /** null → pick a random key per phrase; otherwise use this exact key. */
  key: string | null;
  notesPerBar: NotesPerBar;
  clefTarget: ClefTarget;
}

const pickRandom = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// Normalize 1..(∞) degree to [1..7] + octave shift.
const foldDegree = (d: number): { idx: number; octave: number } => {
  const octave = Math.floor((d - 1) / 7);
  const idx = ((d - 1) % 7 + 7) % 7;
  return { idx, octave };
};

const midiForDegree = (tonic: number, degree: number): number => {
  const { idx, octave } = foldDegree(degree);
  return tonic + MAJOR_SCALE_SEMITONES[idx] + 12 * octave;
};

const labelForDegree = (labels: Label[], degree: number): Label => {
  const { idx } = foldDegree(degree);
  return labels[idx];
};

// Degree offsets from the chord root. All patterns hit chord tones (R, 3,
// 5, 8, and higher-octave doublings); we just reorder them to get variety
// in contour per bar. Drawn uniformly per measure.
const OFFSETS_4: ReadonlyArray<readonly number[]> = [
  [0, 2, 4, 7],         // up
  [7, 4, 2, 0],         // down
  [0, 2, 7, 4],         // up then back to 5
  [7, 4, 0, 2],         // down then back to 3
];

const OFFSETS_8: ReadonlyArray<readonly number[]> = [
  [0, 2, 4, 7, 9, 11, 14, 16],   // up two octaves
  [16, 14, 11, 9, 7, 4, 2, 0],   // down two octaves
  [0, 2, 4, 7, 16, 14, 11, 9],   // up lower, down upper
  [7, 4, 2, 0, 9, 11, 14, 16],   // down lower, up upper
];

const arpOffsets = (notes: NotesPerBar): readonly number[] =>
  pickRandom(notes === 8 ? OFFSETS_8 : OFFSETS_4);

// Center a measure's pitches near the middle of the requested clef. Shifting
// whole octaves preserves all pitch classes and spellings while keeping the
// display readable — without this, high-key V chords sail 8+ ledger lines
// above the staff.
const TREBLE_TARGET_MIDI = 72; // C5
const BASS_TARGET_MIDI = 50;   // D3
const GRAND_TARGET_MIDI = 60;  // C4 (middle C) — spans both clefs naturally

const targetForClef = (clefTarget: ClefTarget): number => {
  if (clefTarget === 'treble') return TREBLE_TARGET_MIDI;
  if (clefTarget === 'bass') return BASS_TARGET_MIDI;
  return GRAND_TARGET_MIDI;
};

const centerOctave = (
  measure: MelodyElement[],
  targetMidi: number,
): MelodyElement[] => {
  const midis = measure
    .filter((el): el is Extract<MelodyElement, { kind: 'note' }> => el.kind === 'note')
    .map((el) => el.midi);
  if (midis.length === 0) return measure;
  const sorted = [...midis].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const shift = -12 * Math.round((median - targetMidi) / 12);
  if (shift === 0) return measure;
  return measure.map((el) =>
    el.kind === 'note' ? { ...el, midi: el.midi + shift } : el,
  );
};

/** Build a fresh arpeggio phrase per the supplied config. */
export const generatePhrase = (config: PhraseConfig): Melody => {
  const { bars, key: keyName, notesPerBar, clefTarget } = config;
  const key =
    keyName ? (MAJOR_KEYS.find((k) => k.name === keyName) ?? pickRandom(MAJOR_KEYS))
            : pickRandom(MAJOR_KEYS);

  const progression = Array.from({ length: bars }, () => 1 + Math.floor(Math.random() * 7));

  const duration: Duration = notesPerBar === 8 ? 'eighth' : 'quarter';

  const measures: MelodyElement[][] = progression.map((rootDeg) => {
    const offsets = arpOffsets(notesPerBar);
    const notes = offsets.map((off): MelodyElement => {
      const degree = rootDeg + off;
      return {
        kind: 'note',
        midi: midiForDegree(key.tonicMidi, degree),
        spelling: labelForDegree(key.degreeLabels, degree),
        duration,
      };
    });
    return centerOctave(notes, targetForClef(clefTarget));
  });

  return {
    id: `arp-${Math.random().toString(36).slice(2, 10)}`,
    title: `${key.name} major — ${progression.map((d) => ROMAN[d]).join(' ')}`,
    timeSignature: { beats: 4, beatValue: 4 },
    keySignature: key.name,
    measures,
  };
};
