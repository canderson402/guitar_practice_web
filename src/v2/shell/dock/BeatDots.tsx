import React from 'react';
import s from './BeatDots.module.css';
import { useTransport } from '../../../audio';

/** Heard beat position from the app-wide transport. Lights instantly on the
 *  frame the beat is heard (no transition in). */
export const BeatDots: React.FC<{ count: number; size?: 'sm' | 'md' }> = ({ count, size = 'sm' }) => {
  const running = useTransport(t => t.running);
  const beat = useTransport(t => t.beatInBar);
  const heard = useTransport(t => t.beatCount >= 0);
  const active = running && heard ? beat : -1;
  return (
    <div className={[s.dots, s[size]].join(' ')} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={[s.dot, i === active ? s.on : '', i === 0 ? s.first : ''].join(' ')} />
      ))}
    </div>
  );
};
