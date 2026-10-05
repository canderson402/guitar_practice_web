import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { setClickVolume } from '../../audio/click';

/** Keep the click at the saved metronome volume — from the start, and as
 *  any slider changes it. Mounted once, in the app shell. */
export const useClickVolumeSync = (): void => {
  const volume = useStore(st => st.metronome.volume);
  useEffect(() => { setClickVolume(volume / 100); }, [volume]);
};
