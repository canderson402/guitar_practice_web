import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Timer.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Stepper } from '../../ui';

type Mode = 'countUp' | 'countDown';

export const TimerSheet: React.FC = () => {
  const t = useStore(useShallow(st => ({
    running: st.timer.isRunning, mode: st.timer.mode as Mode, target: st.timer.targetSeconds,
    setMode: st.setTimerMode, setRunning: st.setTimerRunning, setElapsed: st.setElapsedSeconds, setTarget: st.setTargetSeconds,
  })));
  const changeMode = (mode: Mode) => {
    t.setMode(mode); t.setRunning(false); t.setElapsed(mode === 'countDown' ? t.target : 0);
  };
  const changeTarget = (minutes: number) => {
    t.setTarget(minutes * 60);
    if (t.mode === 'countDown' && !t.running) t.setElapsed(minutes * 60);
  };
  return (
    <>
      <div className={s.field}><span className={s.label}>Mode</span>
        <SegmentedControl<Mode> label="Timer mode" value={t.mode} onChange={changeMode}
          options={[{ value: 'countUp', label: 'Count up' }, { value: 'countDown', label: 'Count down' }]} />
      </div>
      <div className={s.field}><span className={s.label}>Target (minutes)</span>
        <Stepper label="Target minutes" value={Math.round(t.target / 60)} min={1} max={180} small={1} big={5} onChange={changeTarget} />
      </div>
    </>
  );
};
