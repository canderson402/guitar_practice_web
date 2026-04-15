import React from 'react';

// ---------------------------------------------------------------------------
// Button — the workhorse interactive primitive. Wraps design-system.css
// .ds-btn family of classes; no bespoke styling lives here. Use variants to
// swap visual intent (primary action, neutral outline, etc.) and size for
// vertical-rhythm consistency.
// ---------------------------------------------------------------------------

export type ButtonVariant =
  | 'primary'    // filled accent; main actions
  | 'secondary'  // filled secondary accent
  | 'danger'     // filled red; destructive actions
  | 'warning'    // outlined orange; e.g. "Apply to all"
  | 'outline'    // neutral outline; default chip/toggle look
  | 'ghost';     // no border, minimal weight

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fully rounded ends (pill shape). */
  pill?: boolean;
  /** Render as active — used for toggle-like outline/ghost buttons. */
  active?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'ds-btn-primary',
  secondary: 'ds-btn-secondary',
  danger: 'ds-btn-danger',
  // "warning" reuses the outline look with warning color applied by caller
  // via `style` or a wrapper — the core CSS doesn't ship a .ds-btn-warning.
  // See the inline override below.
  warning: 'ds-btn-warning',
  outline: 'ds-btn-outline',
  ghost: 'ds-btn-ghost',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'ds-btn-sm',
  md: '',
  lg: 'ds-btn-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'outline', size = 'md', pill, active, className, type, ...rest }, ref) => {
    const classes = [
      'ds-btn',
      variantClass[variant],
      sizeClass[size],
      pill ? 'ds-btn-pill' : '',
      active ? 'active' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} type={type ?? 'button'} className={classes} {...rest} />
    );
  }
);

Button.displayName = 'Button';
