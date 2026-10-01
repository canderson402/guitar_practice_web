import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './Popover.module.css';
import { useMediaQuery } from './useMediaQuery';
import { useEscape } from './useEscape';

interface Props {
  open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement | null>;
  title: string; children: React.ReactNode; placement?: 'top' | 'bottom';
  /** Width in px (default 272). */
  width?: number;
}

/** Anchored pop-up for single quick controls (dock). Becomes a bottom sheet
 *  under 768px. Closes on Escape and outside pointerdown. */
export const Popover: React.FC<Props> = ({ open, onClose, anchorRef, title, children, placement = 'top', width = 272 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const phone = useMediaQuery('(max-width: 767px)');
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });

  useLayoutEffect(() => {
    if (!open || phone || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    // Keep the whole pop-up on screen (8px margin), whatever its width.
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos(placement === 'top' ? { left, bottom: window.innerHeight - r.top + 8 } : { left, top: r.bottom + 8 });
  }, [open, phone, anchorRef, placement, width]);

  // Move focus into the pop-up on open; hand it back to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    ref.current?.querySelector<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])')?.focus();
    return () => { if (anchor && document.body.contains(anchor)) anchor.focus(); };
  }, [open, anchorRef]);

  useEscape(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  const root = document.querySelector('.gp2') ?? document.body;
  return createPortal(
    <div ref={ref} role="dialog" aria-label={title} className={[s.pop, phone ? s.sheet : ''].join(' ')}
      style={phone ? undefined : { ...pos, width }}>
      <div className={s.title}>{title}</div>
      {children}
    </div>,
    root,
  );
};
