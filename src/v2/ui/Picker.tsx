import React from 'react';
import s from './Picker.module.css';

interface Props<T extends string> {
  label: string; value: T; options: Array<{ value: T; label: React.ReactNode }>;
  onChange(v: T): void; columns?: number;
}

export const Picker = <T extends string>({ label, value, options, onChange, columns = 6 }: Props<T>) => (
  <div role="radiogroup" aria-label={label} className={s.grid} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {options.map(o => (
      <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
        className={[s.opt, o.value === value ? s.on : ''].join(' ')} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);
