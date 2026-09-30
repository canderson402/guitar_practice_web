import React from 'react';
import s from './SegmentedControl.module.css';

interface Props<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  onChange(v: T): void;
  size?: 'sm' | 'md';
}

export const SegmentedControl = <T extends string>({ label, value, options, onChange, size = 'md' }: Props<T>) => {
  const idx = Math.max(0, options.findIndex(o => o.value === value));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    onChange(options[(idx + dir + options.length) % options.length].value);
  };
  return (
    <div role="radiogroup" aria-label={label} className={[s.group, s[size]].join(' ')} onKeyDown={onKeyDown}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            title={o.title} className={[s.seg, on ? s.on : ''].join(' ')} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
