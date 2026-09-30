import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import s from './Dialog.module.css';
import { useFocusTrap } from './useFocusTrap';
import { IconButton } from './IconButton';
import { useEscape } from './useEscape';

export const Dialog: React.FC<{ open: boolean; onClose(): void; title: string; children: React.ReactNode }> = ({
  open, onClose, title, children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  useEscape(open, onClose);
  if (!open) return null;
  const root = document.querySelector('.gp2') ?? document.body;
  return createPortal(
    <div className={s.scrim} onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={s.dialog}>
        <header className={s.head}><h2 className={s.title}>{title}</h2><IconButton label="Close" icon={<X size={16} />} onClick={onClose} /></header>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    root,
  );
};
