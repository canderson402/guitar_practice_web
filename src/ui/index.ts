// Barrel export for the design-system component library. All primitives
// consume classes defined in src/styles/design-system.css — no per-component
// styling lives in these files; they're typed wrappers around the CSS.

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

// ToggleButton removed — the Checkbox primitive now renders as a pill toggle,
// covering the same on/off use case with one shared component.

export { ToggleButtonGroup } from './ToggleButtonGroup';

export { Select } from './Select';
export type { SelectOption, SelectOptionGroup } from './Select';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { Slider } from './Slider';
export type { SliderProps } from './Slider';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

export { Card } from './Card';
export type { CardProps } from './Card';
