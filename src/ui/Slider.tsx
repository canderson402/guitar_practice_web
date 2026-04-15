import React from 'react';

// ---------------------------------------------------------------------------
// Slider — native range input with label + value readout. Keeps the native
// element for accessibility (keyboard support, screen readers) and just
// styles the surrounding layout + accent color.
// ---------------------------------------------------------------------------

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number;
  onValueChange: (next: number) => void;
  label?: React.ReactNode;
  /** Renders the current numeric value next to the slider. Accepts a
   *  formatter for custom units (e.g. `ms`, `%`). Defaults to the raw number. */
  valueFormatter?: (value: number) => string;
  min?: number;
  max?: number;
  step?: number;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  label,
  valueFormatter,
  className,
  ...rest
}) => {
  const display = valueFormatter ? valueFormatter(value) : String(value);
  return (
    <label className={`ds-slider ${className || ''}`}>
      {label !== undefined && <span className="ds-slider-label">{label}</span>}
      <input
        type="range"
        value={value}
        onChange={e => onValueChange(Number(e.target.value))}
        {...rest}
      />
      <span className="ds-slider-value">{display}</span>
    </label>
  );
};
