import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { setInstrumentVolume } from '../../audio/instrumentVolume';

/** Keep the guitar and piano samples at their volumes. Mounted once, in the app shell. */
export const useNoteVolumeSync = (): void => {
  const { guitar, piano } = useStore(st => st.noteVolumes);
  useEffect(() => { setInstrumentVolume('guitar', guitar); }, [guitar]);
  useEffect(() => { setInstrumentVolume('piano', piano); }, [piano]);
};
