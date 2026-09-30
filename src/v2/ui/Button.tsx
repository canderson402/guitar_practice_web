import React from 'react';
import s from './Button.module.css';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} className={[s.btn, s[variant], s[size], className].filter(Boolean).join(' ')} {...rest} />
  ),
);
Button.displayName = 'Button';
