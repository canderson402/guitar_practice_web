import { useStore } from '../../../store/useStore';
import { useCardPref } from '../../state/useCardPref';
import { intervalSpecsEqual } from '../../../data/musicData';
import type { DotLabels } from './harmonyModel';

/** Harmony display settings, remembered in the browser. */
export const useHarmonyPrefs = () => {
  const [labels, setLabels] = useCardPref<DotLabels>('harmony', 'labels', 'order');
  const [showKey, setShowKey] = useCardPref<boolean>('harmony', 'showKey', true);
  const [frets, setFrets] = useCardPref<12 | 24>('harmony', 'frets', 12);
  return { labels, setLabels, showKey, setShowKey, frets, setFrets };
};

/** Apply the default interval to every note, confirming first if that would
 *  overwrite notes given their own interval. */
export const applyDefaultToAll = () => {
  const { harmonyMaker: h, applyDefaultToAll: apply } = useStore.getState();
  const overrides = h.notes.filter(n => !intervalSpecsEqual(n.interval, h.defaultInterval)).length;
  if (overrides > 0 && !window.confirm(
    `Apply the default interval to all ${h.notes.length} notes? This replaces ${overrides} note${overrides === 1 ? '' : 's'} with their own interval.`,
  )) return;
  apply();
};
