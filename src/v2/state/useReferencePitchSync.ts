import { useEffect } from 'react';
import { useV2Store } from './useV2Store';
import { setReferencePitch } from '../../audio/pitch';

/** Keep the audio engine tuned to the saved reference pitch (A4). Mounted
 *  once, in the app shell. */
export const useReferencePitchSync = (): void => {
  const hz = useV2Store(st => st.referencePitch);
  useEffect(() => { setReferencePitch(hz); }, [hz]);
};
