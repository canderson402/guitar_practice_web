import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import s from './V2Layout.module.css';
import { TopBar } from './TopBar';
import { SettingsSheet } from './SettingsSheet';
import { ToastHost } from './ToastHost';
import { useStore } from '../../store/useStore';
import { setMasterVolume } from '../../audio';
import { useTimerClock } from './useTimerClock';

/** The v2 frame. Also applies master volume to the audio engine — in v1 only
 *  the Jam card did this, so v2 owns it at the shell level. */
export const V2Layout: React.FC<{ dock?: React.ReactNode; sheetHost?: React.ReactNode }> = ({ dock, sheetHost }) => {
  const master = useStore(st => st.jam.mixer.master.volume);
  useEffect(() => { setMasterVolume(master / 100); }, [master]);
  useTimerClock();
  return (
    <div className={s.frame}>
      <TopBar />
      <div className={s.content}><Outlet /></div>
      {dock}
      {sheetHost}
      <SettingsSheet />
      <ToastHost />
    </div>
  );
};
