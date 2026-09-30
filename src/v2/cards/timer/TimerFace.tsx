import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Timer.module.css';
import { useStore } from '../../../store/useStore';
import { Button } from '../../ui';
import { HeroFace } from '../HeroFace';

export const formatTime = (seconds: number): string =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export const TimerFace: React.FC = () => {
  const t = useStore(useShallow(st => ({
    running: st.timer.isRunning, elapsed: st.timer.elapsedSeconds, mode: st.timer.mode, target: st.timer.targetSeconds,
    setRunning: st.setTimerRunning, setElapsed: st.setElapsedSeconds,
  })));
  const reset = () => { t.setRunning(false); t.setElapsed(t.mode === 'countDown' ? t.target : 0); };
  return (
    <HeroFace
      top={t.mode === 'countUp' ? 'Count up' : `Count down · ${Math.round(t.target / 60)} min`}
      hero={formatTime(t.elapsed)}
      caption={t.mode === 'countUp' ? 'Elapsed' : 'Remaining'}
      controls={
        <div className={s.actions}>
          <Button size="sm" variant={t.running ? 'secondary' : 'primary'} onClick={() => t.setRunning(!t.running)}>
            {t.running ? 'Pause' : 'Start'}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
        </div>
      }
    />
  );
};
