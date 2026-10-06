import React from 'react';
import { EditableNumber } from './EditableNumber';

/** A length of time as one field, minutes : seconds — click either part to
 *  type it. Never less than a second. */
export const DurationInput: React.FC<{ label: string; seconds: number; onChange(v: number): void; maxMinutes?: number }> = ({
  label, seconds, onChange, maxMinutes = 60,
}) => {
  const m = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const set = (mm: number, ss: number) => onChange(Math.max(1, mm * 60 + ss));
  return (
    <span role="group" aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-20)' }}>
      <EditableNumber label="Minutes" value={m} min={0} max={maxMinutes} onChange={v => set(v, sec)} />
      <span aria-hidden="true">:</span>
      <EditableNumber label="Seconds" value={sec} min={0} max={59} onChange={v => set(m, v)}>{String(sec).padStart(2, '0')}</EditableNumber>
    </span>
  );
};
