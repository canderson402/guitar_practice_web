import React from 'react';
import s from './Stepper.module.css';
import { EditableNumber } from './EditableNumber';

interface Props {
  label: string; value: number; min: number; max: number;
  small?: number; big?: number; onChange(v: number): void; format?(v: number): React.ReactNode;
  /** Click the value to type a number directly. */
  editable?: boolean;
  /** Show only the buttons (the value is displayed elsewhere). */
  hideValue?: boolean;
}

export const Stepper: React.FC<Props> = ({ label, value, min, max, small = 1, big, onChange, format, editable, hideValue }) => {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const lower = label.toLowerCase();
  const btn = (delta: number) => (
    <button type="button" className={s.btn}
      aria-label={`${delta > 0 ? 'Increase' : 'Decrease'} ${lower} by ${Math.abs(delta)}`}
      onClick={() => onChange(clamp(value + delta))}>
      {delta > 0 ? '+' : '−'}{Math.abs(delta)}
    </button>
  );
  return (
    <div className={s.stepper} role="group" aria-label={label}>
      {big && btn(-big)}{btn(-small)}
      {hideValue ? null : editable
        ? <EditableNumber label={label} value={value} min={min} max={max} onChange={v => onChange(clamp(v))} className={s.value} />
        : <span className={s.value} aria-live="polite">{format ? format(value) : value}</span>}
      {btn(small)}{big && btn(big)}
    </div>
  );
};
