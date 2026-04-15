import React from 'react';

// ---------------------------------------------------------------------------
// Checkbox — label + native <input type="checkbox">. Uses .ds-checkbox so
// the whole row is one click target. Controlled-only; pass `checked` +
// `onCheckedChange` (or `onChange` for the raw event).
// ---------------------------------------------------------------------------

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: React.ReactNode;
  /** Optional custom color for the pill. Defaults to a neutral dark gray when
   *  omitted, matching the generic "on/off" look used throughout the app.
   *  Pass a color when the toggle is paired with something color-coded on the
   *  fretboard (root / scale / interval overlays). */
  swatchColor?: string;
  /** Also fires on change if the caller wants the raw event. */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  onChange,
  label,
  disabled,
  swatchColor,
  className,
  style,
  ...rest
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange(e.target.checked);
    onChange?.(e);
  };

  // Every checkbox renders as a toggleable pill. The color is pushed via a
  // CSS var so callers can override without the component knowing about
  // themes; the stylesheet falls back to a neutral dark gray when unset.
  const rowStyle: React.CSSProperties | undefined = swatchColor
    ? { ...style, ['--ds-checkbox-swatch' as any]: swatchColor }
    : style;

  return (
    <label
      className={`ds-checkbox ds-checkbox-swatched ${checked ? 'ds-checkbox-checked' : ''} ${className || ''}`}
      style={rowStyle}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        {...rest}
      />
      <span className="ds-checkbox-label">{label}</span>
    </label>
  );
};
