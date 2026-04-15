import React from 'react';

// ---------------------------------------------------------------------------
// Badge — small uppercase pill used to label inline values (interval name,
// "non-diatonic" tag, count indicators). Purely decorative; not interactive.
// ---------------------------------------------------------------------------

export type BadgeVariant = 'primary' | 'secondary' | 'warning' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantClass: Record<BadgeVariant, string> = {
  primary: 'ds-badge-primary',
  secondary: 'ds-badge-secondary',
  warning: 'ds-badge-warning',
  neutral: '',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className,
  children,
  ...rest
}) => (
  <span className={`ds-badge ${variantClass[variant]} ${className || ''}`} {...rest}>
    {children}
  </span>
);
