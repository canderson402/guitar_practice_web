import React from 'react';
import s from './IconButton.module.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string; icon: React.ReactNode; active?: boolean; size?: 'sm' | 'md';
};

export const IconButton: React.FC<Props> = ({ label, icon, active, size = 'md', className, type = 'button', ...rest }) => (
  <button type={type} aria-label={label} title={label} aria-pressed={active}
    className={[s.icon, s[size], active ? s.active : '', className].filter(Boolean).join(' ')} {...rest}>
    {icon}
  </button>
);
