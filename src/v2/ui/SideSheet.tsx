import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import s from './SideSheet.module.css';
import { useFocusTrap } from './useFocusTrap';
import { IconButton } from './IconButton';
import { useEscape } from './useEscape';

interface Props {
  open: boolean; onClose(): void; title: string; children: React.ReactNode; side?: 'left' | 'right';
  /** Rendered next to the title (e.g. the card's concepts "?"). */
  titleExtra?: React.ReactNode;
}

/** Right-edge settings panel (bottom sheet under 768px via CSS). The page
 *  behind stays visible and live; there is no scrim over the grid. */
export const SideSheet: React.FC<Props> = ({ open, onClose, title, children, side = 'right', titleExtra }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  useEscape(open, onClose);

  // Tap outside closes. Elements marked data-sheet-trigger (card ⚙, app ⚙)
  // are skipped so they can toggle or switch sheets instead.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest?.('[data-sheet-trigger]')) return;
      closeRef.current();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);
  if (!open) return null;
  const root = document.querySelector('.gp2') ?? document.body;
  return createPortal(
    <aside ref={ref} role="dialog" aria-label={title} data-side={side} className={[s.sheet, side === 'left' ? s.left : ''].join(' ')}>
      <header className={s.head}>
        <div className={s.titleRow}><h2 className={s.title}>{title}</h2>{titleExtra}</div>
        <IconButton label="Close" icon={<X size={16} />} onClick={onClose} />
      </header>
      <div className={s.body}>{children}</div>
    </aside>,
    root,
  );
};
