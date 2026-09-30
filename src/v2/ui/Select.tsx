import React from 'react';
import { ChevronDown } from 'lucide-react';
import s from './Select.module.css';

interface Props {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange(v: string): void;
  size?: 'sm' | 'md';
}

/** Native select (keyboard + screen-reader behavior for free), token-styled. */
export const Select: React.FC<Props> = ({ label, value, options, onChange, size = 'md' }) => (
  <span className={[s.wrap, s[size]].join(' ')}>
    <select aria-label={label} className={s.select} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown size={14} className={s.chev} aria-hidden="true" />
  </span>
);
