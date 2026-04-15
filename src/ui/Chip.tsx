import React from 'react';

// ---------------------------------------------------------------------------
// Chip — compact press-for-action control used for preset bars (e.g. interval
// defaults, chord qualities). Distinct from Button: smaller footprint, no
// hover lift, visually quieter by default, louder when active.
// ---------------------------------------------------------------------------

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ active, className, type, ...rest }, ref) => {
    const classes = [
      'ds-preset-btn',
      active ? 'active' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={classes}
        aria-pressed={active}
        {...rest}
      />
    );
  }
);

Chip.displayName = 'Chip';
