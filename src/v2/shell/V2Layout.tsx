import React from 'react';
import { Outlet } from 'react-router-dom';
import s from './V2Layout.module.css';
import { TopBar } from './TopBar';
import { SettingsSheet } from './SettingsSheet';
import { AboutModal } from './AboutModal';
import { ToastHost } from './ToastHost';
import { useTimerClock } from './useTimerClock';
import { useReferencePitchSync } from '../state/useReferencePitchSync';
import { useClickVolumeSync } from '../state/useClickVolumeSync';
import { useMasterVolumeSync } from '../state/useMasterVolumeSync';
import { useNoteVolumeSync } from '../state/useNoteVolumeSync';

/** The v2 frame. Also keeps the audio engine in line with the saved
 *  settings: master volume and mute, click volume, guitar / piano note
 *  volumes, and reference pitch. */
export const V2Layout: React.FC<{ dock?: React.ReactNode; sheetHost?: React.ReactNode }> = ({ dock, sheetHost }) => {
  useMasterVolumeSync();
  useTimerClock();
  useReferencePitchSync();
  useClickVolumeSync();
  useNoteVolumeSync();
  return (
    <div className={s.frame}>
      <TopBar />
      <div className={s.content}><Outlet /></div>
      {dock}
      {sheetHost}
      <SettingsSheet />
      <AboutModal />
      <ToastHost />
    </div>
  );
};
