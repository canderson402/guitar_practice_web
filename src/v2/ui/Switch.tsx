import React from 'react';
import s from './Switch.module.css';

export const Switch: React.FC<{ label: string; checked: boolean; onChange(v: boolean): void }> = ({ label, checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label}
    className={[s.track, checked ? s.on : ''].join(' ')} onClick={() => onChange(!checked)}>
    <span className={s.thumb} />
  </button>
);
