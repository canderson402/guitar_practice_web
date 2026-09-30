import { useEffect } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Keep Tab/Shift+Tab inside `ref` while active; focus the first control on
 *  open and restore the previously focused element on close. */
export const useFocusTrap = (ref: React.RefObject<HTMLElement | null>, active: boolean): void => {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    items()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => { el.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [ref, active]);
};
