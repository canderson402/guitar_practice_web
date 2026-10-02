import { scales, getChromaticPosition } from '../../../data/musicData';
import { findAllVoicings, VoicingPosition } from '../../../data/harmonyVoicings';
import type { generateFretboard } from '../../../data/guitarData';
import { DotInfo, posKey } from '../../../components/Fretboard/types';
import type { HarmonyNote } from '../../../store/useStore';
import { cellToMidi } from '../../../data/pitch';

type FretboardCell = ReturnType<typeof generateFretboard>[number][number];

export type DotLabels = 'order' | 'notes';

/** One of your notes plus its harmony: every spot the harmony could be played
 *  (voicings) and the one chosen. */
export interface ResolvedPair {
  note: HarmonyNote;
  /** Stable id: the note's fret position. */
  key: string;
  baseName: string;
  voicings: VoicingPosition[];
  selectedIdx: number;
  selected: VoicingPosition | null;
  diatonic: boolean;
  /** The harmony is at its saved spot (rather than a freshly chosen one). */
  pinned: boolean;
}

/** Each note with its harmony, placed so the pair is playable:
 *  1. a spot the player picked (if it's still valid), otherwise
 *  2. the best-scoring spot — on another string than its note (both can be
 *     played at once), exactly the interval above, within a hand's reach,
 *     close to the previous harmony (stays in position) —
 *  never on a spot already taken by one of your notes or an earlier harmony. */
export const resolvePairs = (
  notes: HarmonyNote[], root: string | null, scale: string | null, board: FretboardCell[][], fretCount: number,
  tuning: string[],
): ResolvedPair[] => {
  const taken = new Set(notes.map(n => posKey(n.stringIndex, n.fret)));
  let prev: VoicingPosition | null = null;
  return notes.map(n => {
    const key = posKey(n.stringIndex, n.fret);
    const baseName = board[n.stringIndex]?.[n.fret]?.note ?? '';
    // Placed since the last Apply: no harmony yet.
    const valid = n.harmonized !== false && root && scale && scales[scale as keyof typeof scales];
    const result = valid ? findAllVoicings(n, n.interval, root!, scale as keyof typeof scales, board, fretCount) : null;
    if (!result || result.voicings.length === 0) return { note: n, key, baseName, voicings: [], selectedIdx: 0, selected: null, diatonic: true, pinned: false };
    const { voicings } = result;
    const free = (v: VoicingPosition) => !taken.has(posKey(v.stringIndex, v.fret));

    const picked = n.harmonyAt ? voicings.findIndex(v => at(v, n.harmonyAt!.stringIndex, n.harmonyAt!.fret)) : -1;
    let selectedIdx = picked;
    if (selectedIdx < 0) {
      const target = harmonyTarget(cellToMidi(tuning, n.stringIndex, n.fret), result.targetNote);
      const score = (v: VoicingPosition) => placementScore(n, v, cellToMidi(tuning, v.stringIndex, v.fret), target, prev);
      const ranked = voicings.map((v, i) => ({ i, s: score(v) })).sort((x, y) => x.s - y.s);
      selectedIdx = (ranked.find(r => free(voicings[r.i])) ?? ranked[0]).i;
    }
    const selected = voicings[selectedIdx];
    taken.add(posKey(selected.stringIndex, selected.fret));
    prev = selected;
    return { note: n, key, baseName, voicings, selectedIdx, selected, diatonic: result.diatonic, pinned: picked >= 0 };
  });
};

/** The harmony's exact pitch: the nearest `targetNote` above the note
 *  (an octave harmony is 12 semitones up, never the same pitch). */
const harmonyTarget = (baseMidi: number, targetNote: string): number => {
  let m = baseMidi + 1;
  while (((m % 12) + 12) % 12 !== getChromaticPosition(targetNote)) m += 1;
  return m;
};

/** Lower is better. Weights: unplayable (same string) ≫ wrong octave ≫ a
 *  stretch over 4 frets > fret distance > distance from the previous
 *  harmony > skipping strings. Open strings count by their fret (0) too, so
 *  shapes stay in one hand position. */
const placementScore = (base: Pos, v: Pos, midi: number, target: number, prev: Pos | null): number => {
  const stretch = Math.abs(v.fret - base.fret);
  return (v.stringIndex === base.stringIndex ? 10000 : 0)
    + Math.abs(midi - target) / 12 * 500
    + (stretch > 4 ? 100 : 0)
    + stretch * 4
    + (prev ? Math.abs(v.fret - prev.fret) : 0)
    + (Math.abs(v.stringIndex - base.stringIndex) - 1) * 2;
};

type Pos = { stringIndex: number; fret: number };
const at = (v: Pos, si: number, fret: number) => v.stringIndex === si && v.fret === fret;

/** Everywhere else on the neck the note at (si, fret) can be played (same
 *  note name — like harmony spots, any octave). */
export const sameNotePositions = (board: FretboardCell[][], si: number, fret: number, fretCount: number): Pos[] => {
  const name = board[si]?.[fret]?.note;
  if (!name) return [];
  const pc = getChromaticPosition(name);
  const out: Pos[] = [];
  board.forEach((string, s) => string.forEach(cell => {
    if (cell && cell.fret <= fretCount && !at(cell, si, fret) && getChromaticPosition(cell.note) === pc) out.push({ stringIndex: s, fret: cell.fret });
  }));
  return out;
};

/** Harmonies (that exist) in the harmony order — separate from the melody
 *  order: by each note's harmonyRank, else its melody position. */
export const harmonyOrder = (pairs: ResolvedPair[]): ResolvedPair[] =>
  pairs.map((p, i) => ({ p, i, r: p.note.harmonyRank ?? i }))
    .filter(x => x.p.selected)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(x => x.p);

/** Index of the option closest to where something was dropped (moving across
 *  strings counts more than along them — as in the old Harmony card). */
export const nearest = (options: Pos[], si: number, fret: number): number => {
  let best = 0;
  let bestDist = Infinity;
  options.forEach((o, i) => {
    const d = Math.abs(o.stringIndex - si) * 3 + Math.abs(o.fret - fret);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
};

/** Dots for the single Harmony fretboard. Priority: your notes > chosen
 *  harmonies > alternates (only for the harmony being placed) > key notes. */
export const buildHarmonyDots = (i: {
  pairs: ResolvedPair[];
  labels: DotLabels;
  /** Key of the pair whose harmony spot is being chosen. */
  choosing: string | null;
  /** Faint overlay of the key's notes. */
  keyNotes?: { root: string; scaleNotes: string[]; board: FretboardCell[][]; fretCount: number } | null;
  /** One of your notes being dragged: the other spots it could move to. */
  movingBase?: { pair: string; positions: Pos[] } | null;
}): Map<string, DotInfo> => {
  const m = new Map<string, DotInfo>();
  if (i.keyNotes) {
    // Faint grey (root included): a quiet map of the key under your notes.
    const { scaleNotes, board, fretCount } = i.keyNotes;
    const inKey = new Set(scaleNotes.map(getChromaticPosition));
    board.forEach((string, si) => string.forEach(cell => {
      // Open strings are skipped: their cell is the string's name label.
      if (!cell || cell.fret === 0 || cell.fret > fretCount || !inKey.has(getChromaticPosition(cell.note))) return;
      m.set(posKey(si, cell.fret), { variant: 'scale', faint: true, label: '', color: 'var(--text-muted)' });
    }));
  }
  const label = (order: number, name: string) => (i.labels === 'order' ? String(order) : name);
  // Harmonies are numbered in the harmony order (separate from the melody's).
  harmonyOrder(i.pairs).forEach((p, idx) => {
    if (!p.selected) return;
    if (p.key === i.choosing) {
      p.voicings.forEach((v, vi) => {
        if (vi !== p.selectedIdx) m.set(posKey(v.stringIndex, v.fret), { variant: 'alternate', label: label(idx + 1, v.note), dropTargetHint: true, nonDiatonic: !p.diatonic });
      });
    }
    m.set(posKey(p.selected.stringIndex, p.selected.fret), { variant: 'harmony', label: label(idx + 1, p.selected.note), nonDiatonic: !p.diatonic, draggable: true });
  });
  if (i.movingBase) {
    const idx = i.pairs.findIndex(p => p.key === i.movingBase!.pair);
    const p = i.pairs[idx];
    if (p) i.movingBase.positions.forEach(v => m.set(posKey(v.stringIndex, v.fret), { variant: 'alternate', label: label(idx + 1, p.baseName), dropTargetHint: true }));
  }
  i.pairs.forEach((p, idx) => m.set(p.key, { variant: 'base', label: label(idx + 1, p.baseName), draggable: true }));
  return m;
};

export type ClickAction =
  | { kind: 'toggleBase' }
  | { kind: 'choose'; pair: string }
  | { kind: 'pick'; pair: string; index: number }
  | { kind: 'stopChoosing' };

/** What a click on a fret means. While choosing a harmony's spot, a click on
 *  one of its spots picks it and anything else cancels. Otherwise a click on
 *  a chosen harmony starts choosing; any other fret adds/removes your note. */
export const clickAction = (pairs: ResolvedPair[], choosing: string | null, si: number, fret: number): ClickAction => {
  if (choosing) {
    const p = pairs.find(x => x.key === choosing);
    const index = p ? p.voicings.findIndex(v => at(v, si, fret)) : -1;
    return p && index >= 0 && index !== p.selectedIdx ? { kind: 'pick', pair: p.key, index } : { kind: 'stopChoosing' };
  }
  if (pairs.some(p => at(p.note, si, fret))) return { kind: 'toggleBase' };
  const owner = pairs.find(p => p.selected && at(p.selected, si, fret) && p.voicings.length > 1);
  return owner ? { kind: 'choose', pair: owner.key } : { kind: 'toggleBase' };
};
