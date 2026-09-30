import { useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { useCardPref } from '../../state/useCardPref';
import { getPatch } from '../../../audio/padSynth';
import {
  initJam, setPadPatch, setPadSettings, setPadVolume, padDefaultsFor, DEFAULT_PATCH_ID,
} from '../../../audio/jamEngine';
import type { PadSettings } from '../../../audio/jamEngine';

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

/** Mounted with the card face: starts the shared engine, applies the saved
 *  sound, and keeps the pad level in sync. */
export const useJamEngine = () => {
  const { patchId, pad } = useJamSound();
  const level = useStore(s => s.jam.mixer.chords);
  useEffect(() => {
    initJam();
    setPadPatch(patchId);
    setPadSettings(pad);
    // Apply the saved sound once, on mount; later changes apply as they're made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPadVolume(level.volume, level.muted); }, [level.volume, level.muted]);
};
