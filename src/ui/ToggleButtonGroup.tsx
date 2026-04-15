import React from 'react';

// ---------------------------------------------------------------------------
// ToggleButtonGroup — two layouts:
//   - "adjacent": buttons sit side by side with their own borders (use for
//     a cluster of independent toggles like Order # / All Voicings)
//   - "segmented": pill-shaped bg with one "selected" option visibly lifted
//     (use for exclusive-choice controls like play-mode: base / harmony / both)
// Orientation is purely visual; both layouts accept any child components.
// ---------------------------------------------------------------------------

interface Props {
  children: React.ReactNode;
  /** `adjacent` = neighboring pills; `segmented` = single rounded bar with one highlighted. */
  layout?: 'adjacent' | 'segmented';
  /** Accessibility hint — required when the group represents a set of related choices. */
  label?: string;
  className?: string;
}

export const ToggleButtonGroup: React.FC<Props> = ({
  children,
  layout = 'adjacent',
  label,
  className,
}) => {
  const layoutClass = layout === 'segmented' ? 'ds-segmented' : 'ds-btn-group';
  return (
    <div
      role="group"
      aria-label={label}
      className={`${layoutClass} ${className || ''}`}
    >
      {children}
    </div>
  );
};
