import React from 'react';
import { Popover } from '../../ui';
import { KeyPicker } from '../KeyPicker';

export { CIRCLE_KEYS, scaleShortName } from '../KeyPicker';

export const KeyPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement | null> }> = (p) => (
  <Popover {...p} title="Key"><KeyPicker /></Popover>
);
