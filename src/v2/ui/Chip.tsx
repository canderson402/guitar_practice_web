import React from 'react';
import s from './Chip.module.css';

export const Chip: React.FC<{ children: React.ReactNode; active?: boolean; onClick?: () => void; title?: string }> = ({
  children, active, onClick, title,
}) => onClick ? (
  <button type="button" title={title} onClick={onClick} aria-expanded={active}
    className={[s.chip, s.button, active ? s.active : ''].join(' ')}>{children}</button>
) : (
  <span title={title} className={s.chip}>{children}</span>
);
