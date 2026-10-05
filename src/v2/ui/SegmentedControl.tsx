import React from 'react';
import s from './SegmentedControl.module.css';

interface Props<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: React.ReactNode; title?: string }>;
  onChange(v: T): void;
  size?: 'sm' | 'md';
  /** Wrap into rows of this many segments. */
  columns?: number;
}

export const SegmentedControl = <T extends string>({ label, value, options, onChange, size = 'md', columns }: Props<T>) => {
  const idx = Math.max(0, options.findIndex(o => o.value === value));
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    onChange(options[(idx + dir + options.length) % options.length].value);
  };
  return (
    <div role="radiogroup" aria-label={label} className={[s.group, s[size], columns ? s.wrapped : ''].join(' ')}
      style={columns ? ({ '--columns': String(columns) } as React.CSSProperties) : undefined} onKeyDown={onKeyDown}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            aria-label={o.title} className={[s.seg, on ? s.on : ''].join(' ')} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
};
