import { useEffect } from 'react';
import { useCardPref } from '../../state/useCardPref';
import { getPatch } from '../../../audio/padSynth';
import {
  initJam, setPadPatch, setPadSettings, setJamMix, setDrumGroove, setChordColor, setBassPattern, padDefaultsFor, DEFAULT_PATCH_ID, DEFAULT_MIX,
} from '../../../audio/jamEngine';
import { useStore } from '../../../store/useStore';
import type { Color, BassPattern } from '../../../data/jamHarmony';
import type { PadSettings, JamMix, TrackId, TrackMix } from '../../../audio/jamEngine';
import type { GrooveId } from '../../../data/drumGrooves';

/** The pad sound and its settings, remembered in the browser. Changes go
 *  straight to the shared engine. */
export const useJamSound = () => {
  const [patchId, setPatchPref] = useCardPref<string>('jam', 'patchId', DEFAULT_PATCH_ID);
  const [saved, setPadPref] = useCardPref<PadSettings | undefined>('jam', 'pad', undefined);
  const pad = saved ?? padDefaultsFor(getPatch(patchId));
  return {
    patchId,
    pad,
    choosePatch: (id: string) => { setPatchPref(id); setPadPref(setPadPatch(id)); },
    setPad: (p: PadSettings) => { setPadPref(p); setPadSettings(p); },
    resetPad: () => { const p = padDefaultsFor(getPatch(patchId)); setPadPref(p); setPadSettings(p); },
  };
};

export type DrumChoice = GrooveId | 'off';

/** The mixer and the drum groove, remembered in the browser. Changes go
 *  straight to the shared engine. */
export const useJamMix = () => {
  const [savedMix, setMixPref] = useCardPref<Partial<JamMix>>('jam', 'mix', DEFAULT_MIX);
  // Tracks added since the mix was saved get their defaults.
  const mix: JamMix = { ...DEFAULT_MIX, ...savedMix };
  const [groove, setGroovePref] = useCardPref<DrumChoice>('jam', 'groove', 'rock');
  return {
    mix,
    groove,
    setTrack: (id: TrackId, change: Partial<TrackMix>) => {
      const next = { ...mix, [id]: { ...mix[id], ...change } };
      setMixPref(next);
      setJamMix(next);
    },
    setGroove: (id: DrumChoice) => { setGroovePref(id); setDrumGroove(id); },
  };
};

/** Chord color (triads, 7ths, lush), remembered in the browser. */
export const useJamColor = () => {
  const [color, setPref] = useCardPref<Color>('jam', 'color', 'lush');
  return { color, setColor: (c: Color) => { setPref(c); setChordColor(c); } };
};

/** Bass pattern, remembered in the browser. */
export const useJamBassPattern = () => {
  const [pattern, setPref] = useCardPref<BassPattern>('jam', 'bassPattern', 'bar');
  return { pattern, setPattern: (p: BassPattern) => { setPref(p); setBassPattern(p); } };
};

export interface SavedProgression { id: string; degrees: number[] }
type Chosen = { id: string | null; degrees: number[] };

/** The chosen progression (a library id, one of yours, or 'custom' while
 *  editing) and your saved progressions — remembered in the browser. */
export const useJamProgression = () => {
  const [, setChosen] = useCardPref<Chosen | undefined>('jam', 'progression', undefined);
  const [saved, setSaved] = useCardPref<SavedProgression[]>('jam', 'progressions', []);
  const choose = (id: string | null, degrees: number[]) => {
    setChosen({ id, degrees });
    useStore.getState().setJamProgression(id, degrees);
    useStore.getState().rebuildJamQueue();
  };
  return {
    saved,
    choose,
    save: (degrees: number[]) => {
      const id = `mine-${Date.now()}`;
      setSaved([...saved, { id, degrees }]);
      choose(id, degrees);
    },
    remove: (id: string) => setSaved(saved.filter(p => p.id !== id)),
  };
};

/** Mounted with the card face: starts the shared engine and applies the
 *  saved sound, mix, groove, color and progression. */
export const useJamEngine = () => {
  const { patchId, pad } = useJamSound();
  const { mix, groove } = useJamMix();
  const { color } = useJamColor();
  const { pattern } = useJamBassPattern();
  const [chosen] = useCardPref<Chosen | undefined>('jam', 'progression', undefined);
  useEffect(() => {
    initJam();
    setPadPatch(patchId);
    setPadSettings(pad);
    setJamMix(mix);
    setDrumGroove(groove);
    setChordColor(color);
    setBassPattern(pattern);
    if (chosen && chosen.degrees.length) useStore.getState().setJamProgression(chosen.id, chosen.degrees);
    // Apply the saved settings once, on mount; later changes apply as they're made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
