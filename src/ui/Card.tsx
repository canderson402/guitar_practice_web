import React from 'react';

// ---------------------------------------------------------------------------
// Card — a light-background panel with a border radius. Used for grouped
// content blocks (interval analysis, legend popover, sequencer slot, etc.).
// `subtle` drops the border for when the card sits inside another card.
//
// Note: this is NOT the top-level draggable card in SimpleDragDrop — that
// lives in src/components/Card.tsx and has different semantics (drag handle,
// theme integration). Both may coexist; this one is the generic panel.
// ---------------------------------------------------------------------------

export interface CardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  subtle?: boolean;
  /** Optional heading rendered above the content area. */
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  subtle,
  title,
  className,
  children,
  ...rest
}) => (
  <div className={`ds-panel ${subtle ? 'ds-panel-subtle' : ''} ${className || ''}`} {...rest}>
    {title !== undefined && <div className="ds-panel-title">{title}</div>}
    {children}
  </div>
);
