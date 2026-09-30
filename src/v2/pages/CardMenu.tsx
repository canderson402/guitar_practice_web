import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from '../ui';
import { useEscape } from '../ui/useEscape';
import { useV2Store } from '../state/useV2Store';
import s from './PracticePage.module.css';

export const CardMenu: React.FC<{ cardId: string; title: string }> = ({ cardId, title }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { workspaces, activeWorkspaceId, removeCard, moveCardToWorkspace } = useV2Store(useShallow(x => ({
    workspaces: x.workspaces, activeWorkspaceId: x.activeWorkspaceId,
    removeCard: x.removeCard, moveCardToWorkspace: x.moveCardToWorkspace,
  })));

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) ref.current?.querySelector<HTMLElement>('button')?.focus();
  };

  useEscape(open, () => close(true));

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
    list[next]?.focus();
  };

  return (
    <div ref={ref} className={s.menuWrap} onPointerDown={e => e.stopPropagation()}>
      <IconButton size="sm" label={`${title} options`} icon={<MoreHorizontal size={14} />}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} />
      {open && (
        <div ref={menuRef} role="menu" aria-label={`${title} options`} className={s.menu} onKeyDown={onMenuKeyDown}>
          <button role="menuitem" className={s.menuItem} onClick={() => { close(false); removeCard(activeWorkspaceId, cardId); }}>Remove</button>
          {workspaces.filter(w => w.id !== activeWorkspaceId).map(w => (
            <button key={w.id} role="menuitem" className={s.menuItem}
              onClick={() => { close(false); moveCardToWorkspace(cardId, activeWorkspaceId, w.id); }}>
              Move to {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
