import { scales, getChromaticPosition } from '../../data/musicData';

const SYMBOLS = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
const NAMES: Record<string, string> = {
  '1': 'root', '♭2': 'minor second', '2': 'major second', '♭3': 'minor third', '3': 'major third',
  '4': 'perfect fourth', '♯4': 'tritone', '♭5': 'tritone', '5': 'perfect fifth', '♯5': 'minor sixth',
  '♭6': 'minor sixth', '6': 'major sixth', '♭7': 'minor seventh', '7': 'major seventh',
};

export const chromaticPosition = (note: string): number => getChromaticPosition(note);

/** Interval symbol of `note` above `root`, e.g. ('A','C') → '♭3'. */
export const intervalSymbol = (root: string, note: string): string =>
  SYMBOLS[(chromaticPosition(note) - chromaticPosition(root) + 12) % 12];

export const intervalName = (symbol: string): string | null => NAMES[symbol] ?? null;

/** The scale's own degree labels (from its description), e.g. Aeolian →
 *  ['1','2','♭3',…]; null for an unknown scale. */
export const scaleDegreeLabels = (scaleName: string): string[] | null => {
  const scale = scales[scaleName as keyof typeof scales];
  return scale?.description ? scale.description.split(' - ') : null;
};
