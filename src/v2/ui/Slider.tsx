import React from 'react';
import s from './Slider.module.css';

interface Props {
  label: string; value: number; min: number; max: number; step?: number;
  onChange(v: number): void; showValue?: boolean; format?(v: number): string;
}

export const Slider: React.FC<Props> = ({ label, value, min, max, step = 1, onChange, showValue, format }) => {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className={s.row}>
      <input type="range" aria-label={label} className={s.range} min={min} max={max} step={step} value={value}
        style={{ ['--pct' as any]: `${pct}%` }} onChange={e => onChange(Number(e.target.value))} />
      {showValue && <span className={s.value}>{format ? format(value) : value}</span>}
    </div>
  );
};
