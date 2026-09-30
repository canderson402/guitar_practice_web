import { useV2Store } from './useV2Store';

/** A persisted per-card setting with a default: [value, setValue]. */
export const useCardPref = <T,>(cardId: string, key: string, fallback: T): [T, (v: T) => void] => {
  const value = useV2Store(s => s.cardPrefs[cardId]?.[key]) as T | undefined;
  const setCardPref = useV2Store(s => s.setCardPref);
  return [value ?? fallback, (v: T) => setCardPref(cardId, key, v)];
};
