import React from 'react';
import { Button, ButtonVariant, ButtonSize } from './Button';

// ---------------------------------------------------------------------------
// IconButton — square button for a single glyph (`?`, `✕`, `▲`, etc.).
// Always requires an aria-label for accessibility since there's no visible text.
// ---------------------------------------------------------------------------

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Accessible label — required since icon buttons have no visible text. */
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fully rounded (circular). */
  round?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ round, className, ...rest }, ref) => (
    <Button
      ref={ref}
      className={`ds-btn-icon ${round ? 'ds-btn-pill' : ''} ${className || ''}`}
      {...rest}
    />
  )
);

IconButton.displayName = 'IconButton';
