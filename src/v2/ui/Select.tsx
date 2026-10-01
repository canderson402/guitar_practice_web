import React from 'react';
import { ChevronDown } from 'lucide-react';
import s from './Select.module.css';

interface Props {
  label: string;
  value: string;
  /** `group` renders consecutive options under a labeled <optgroup>. */
  options: Array<{ value: string; label: string; disabled?: boolean; group?: string }>;
  onChange(v: string): void;
  size?: 'sm' | 'md';
}

/** Consecutive options sharing a `group`, in order. */
const groupOptions = <T extends { group?: string }>(options: T[]): Array<[string | undefined, T[]]> =>
  options.reduce<Array<[string | undefined, T[]]>>((acc, o) => {
    const last = acc[acc.length - 1];
    if (last && last[0] === o.group) last[1].push(o); else acc.push([o.group, [o]]);
    return acc;
  }, []);

/** Native select (keyboard + screen-reader behavior for free), token-styled. */
export const Select: React.FC<Props> = ({ label, value, options, onChange, size = 'md' }) => (
  <span className={[s.wrap, s[size]].join(' ')}>
    <select aria-label={label} className={s.select} value={value} onChange={e => onChange(e.target.value)}>
      {groupOptions(options).map(([group, opts]) => {
        const items = opts.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>);
        return group ? <optgroup key={group} label={group}>{items}</optgroup> : items;
      })}
    </select>
    <ChevronDown size={14} className={s.chev} aria-hidden="true" />
  </span>
);
