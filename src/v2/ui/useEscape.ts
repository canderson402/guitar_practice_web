import { useEffect, useRef } from 'react';
import { pushEscape } from './escapeStack';

/** While `active`, Escape calls `onEscape` — but only if this is the
 *  top-most open layer. */
export const useEscape = (active: boolean, onEscape: () => void): void => {
  const ref = useRef(onEscape);
  ref.current = onEscape;
  useEffect(() => (active ? pushEscape(() => ref.current()) : undefined), [active]);
};
