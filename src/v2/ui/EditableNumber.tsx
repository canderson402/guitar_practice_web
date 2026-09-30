import React, { useState } from 'react';
import s from './EditableNumber.module.css';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange(v: number): void;
  className?: string;
  children?: React.ReactNode;
  /** If given, only these values are accepted (others are ignored). */
  allowed?: number[];
}

/** A number that turns into a text box when clicked: type a value, Enter or
 *  click away to commit (clamped to min–max), Escape to cancel. */
export const EditableNumber: React.FC<Props> = ({ label, value, min, max, onChange, className, children, allowed }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Math.round(Number(draft));
    const ok = draft.trim() !== '' && Number.isFinite(v) && (!allowed || allowed.includes(v));
    if (ok) onChange(Math.max(min, Math.min(max, v)));
    setDraft(null);
  };
  if (draft !== null) {
    return (
      <input type="number" aria-label={label} autoFocus className={[s.input, className].filter(Boolean).join(' ')}
        min={min} max={max} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onFocus={e => e.target.select()}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setDraft(null); }
        }} />
    );
  }
  return (
    <button type="button" aria-label={`${label}: ${value}, click to type`} className={[s.value, className].filter(Boolean).join(' ')}
      onClick={() => setDraft(String(value))}>
      {children ?? value}
    </button>
  );
};
