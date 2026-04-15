import React from 'react';

// ---------------------------------------------------------------------------
// Select — wraps the native <select> with our .ds-select styling.
// Supports two ergonomic shapes:
//   1. Flat: pass `options={[{value, label}, ...]}` for a simple list.
//   2. Structured: pass `groups={[{label, options: [...]}]}` to render
//      <optgroup> sections (used for Diatonic / Chromatic splits, etc).
// Also accepts children for full manual control if neither shape fits.
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface BaseProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md';
  /** Optional visible label rendered above the select. */
  label?: string;
}

type Props =
  | (BaseProps & { options: SelectOption[]; groups?: never; children?: never })
  | (BaseProps & { groups: SelectOptionGroup[]; options?: never; children?: never })
  | (BaseProps & { children: React.ReactNode; options?: never; groups?: never });

export const Select: React.FC<Props> = (props) => {
  const { size = 'md', label, className } = props;
  const classes = [
    'ds-select',
    size === 'sm' ? 'ds-input-sm' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  // Build <option> tree from whichever shape the caller used.
  let body: React.ReactNode;
  if ('options' in props && props.options) {
    body = props.options.map(o => (
      <option key={o.value} value={o.value} disabled={o.disabled}>
        {o.label}
      </option>
    ));
  } else if ('groups' in props && props.groups) {
    body = props.groups.map(g => (
      <optgroup key={g.label} label={g.label}>
        {g.options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </optgroup>
    ));
  } else if ('children' in props) {
    body = props.children;
  }

  // Filter out props that aren't valid on a native <select>.
  const {
    size: _size,
    label: _label,
    className: _className,
    options: _options,
    groups: _groups,
    children: _children,
    ...selectProps
  } = props as BaseProps & {
    options?: SelectOption[];
    groups?: SelectOptionGroup[];
    children?: React.ReactNode;
  };

  const select = (
    <select
      className={classes}
      {...(selectProps as React.SelectHTMLAttributes<HTMLSelectElement>)}
    >
      {body}
    </select>
  );

  if (!label) return select;
  return (
    <label className="ds-form-group">
      <span className="ds-label">{label}</span>
      {select}
    </label>
  );
};
