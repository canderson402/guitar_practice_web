import {
  IntervalSpec,
  getChromaticPosition,
  resolveInterval,
  scales,
} from './musicData';

// Shape of each cell in the fretboard grid returned by generateFretboard().
// Defined locally since guitarData.ts doesn't export a named type.
interface FretboardCell {
  fret: number;
  note: string;
  stringIndex: number;
  isOpen: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers for HarmonyMaker voicing discovery. Kept free of React / store
// so they can be tested in isolation and reused.
// ---------------------------------------------------------------------------

export interface VoicingPosition {
  stringIndex: number;
  fret: number;
  /** The note name at this position — derived from the fretboard at the time
   *  voicings were computed. Callers should treat this as advisory only; the
   *  source of truth for note names is always fretboard[si][f].note. */
  note: string;
}

// Weight string-movement heavier than fret-movement when sorting voicing
// candidates: moving across strings is a bigger physical jump than sliding
// along one string.
export const positionDistance = (
  a: { stringIndex: number; fret: number },
  b: { stringIndex: number; fret: number }
): number => {
  const stringDist = Math.abs(a.stringIndex - b.stringIndex) * 3;
  const fretDist = Math.abs(a.fret - b.fret);
  return stringDist + fretDist;
};

// For a given base position and interval spec, find every place the resolved
// harmony note can be played within the provided fretboard, sorted by
// proximity to the base position. The base note name is looked up from the
// fretboard — positions are the only stored data.
export const findAllVoicings = (
  basePos: { stringIndex: number; fret: number },
  spec: IntervalSpec,
  rootNote: string,
  scaleType: keyof typeof scales,
  fretboard: FretboardCell[][],
  fretCount: number
): { voicings: VoicingPosition[]; diatonic: boolean; targetNote: string } | null => {
  const baseCell = fretboard[basePos.stringIndex]?.[basePos.fret];
  if (!baseCell) return null;
  const result = resolveInterval(baseCell.note, rootNote, scaleType, spec);
  if (!result) return null;

  const targetPos = getChromaticPosition(result.note);
  const voicings: VoicingPosition[] = [];

  for (let si = 0; si < fretboard.length; si++) {
    for (let f = 0; f <= fretCount; f++) {
      const fretNote = fretboard[si][f];
      if (!fretNote) continue;
      if (getChromaticPosition(fretNote.note) === targetPos) {
        voicings.push({ stringIndex: si, fret: f, note: result.note });
      }
    }
  }

  voicings.sort((a, b) => positionDistance(basePos, a) - positionDistance(basePos, b));

  return { voicings, diatonic: result.diatonic, targetNote: result.note };
};
