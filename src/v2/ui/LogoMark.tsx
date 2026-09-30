import React from 'react';
import s from './LogoMark.module.css';

export const LogoMark: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <span aria-hidden="true" className={s.mark} style={{ width: size, height: size }} />
);
