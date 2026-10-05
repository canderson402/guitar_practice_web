import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { setMasterVolume } from '../../audio';

/** Keep the output at the master volume (silent while master is muted).
 *  Mounted once, in the app shell. */
export const useMasterVolumeSync = (): void => {
  const { volume, muted } = useStore(st => st.jam.mixer.master);
  useEffect(() => { setMasterVolume(muted ? 0 : volume / 100); }, [volume, muted]);
};
