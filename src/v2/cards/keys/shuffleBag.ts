import { create } from 'zustand';
import { markPlayed } from './keyCycle';

/** Keys played this shuffle round (not persisted: a reload starts a new round). */
export const useShuffleBag = create<{
  played: string[];
  record: (note: string) => string[];
  reset: (current?: string) => void;
}>((set, get) => ({
  played: [],
  record: note => { const played = markPlayed(get().played, note); set({ played }); return played; },
  reset: current => set({ played: current ? [current] : [] }),
}));
