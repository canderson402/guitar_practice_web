import React from 'react';
import s from './ChipButton.module.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Selected look (pass aria-pressed / aria-current yourself as fits). */
  selected?: boolean;
  /** A drag is hovering over this chip. */
  target?: boolean;
  /** Selected color: the accent (default) or solid text color. */
  tone?: 'accent' | 'solid';
  /** Its own selected color instead (e.g. a scale position's). */
  color?: string;
};

/** The one chip-style button: every selected / hover / disabled / focus /
 *  drop-target state is defined here, on the chip itself, with a constant
 *  border so changing state never changes its size. Use `className` for
 *  layout (padding, two-line content), not for state colors. */
export const ChipButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ selected, target, tone = 'accent', color, className, type = 'button', style, ...rest }, ref) => (
    <button ref={ref} type={type} {...rest}
      style={color ? { ...style, ['--chip-color' as string]: color } : style}
      className={[s.chip, color ? s.custom : s[tone], selected ? s.selected : '', target ? s.target : '', className].filter(Boolean).join(' ')} />
  ),
);
ChipButton.displayName = 'ChipButton';

/** A chip's muted second line (styled with the chip's states). */
export const ChipSub: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className={s.sub}>{children}</span>;
