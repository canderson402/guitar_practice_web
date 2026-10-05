import React from 'react';
import { Settings, GripVertical } from 'lucide-react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import s from './CardFrame.module.css';
import type { CardDef } from './registry';
import { IconButton } from '../ui';

interface Props {
  def: CardDef;
  editing: boolean;
  onOpenSheet(): void;
  menu?: React.ReactNode;
  /** dnd-kit wiring: pointer-drag from anywhere on the header, keyboard
   *  reordering only from the dedicated handle (no nested-button header). */
  drag?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
    setActivatorNodeRef(el: HTMLElement | null): void;
  };
}


export const CardFrame: React.FC<Props> = ({ def, editing, onOpenSheet, menu, drag }) => {
  const { Face, HeaderTools } = def;
  // dnd-kit types its listeners loosely (Function); narrow the keyboard one.
  const { onKeyDown, ...pointerListeners } = (drag?.listeners ?? {}) as { onKeyDown?: React.KeyboardEventHandler<HTMLElement> } & Record<string, unknown>;
  return (
    <article className={[s.card, editing ? s.editing : ''].join(' ')} aria-label={def.title} data-card-id={def.id}>
      <header className={s.head} {...pointerListeners}>
        {drag && (
          <button type="button" ref={drag.setActivatorNodeRef} className={s.handle}
            {...drag.attributes} onKeyDown={onKeyDown} aria-label={`Reorder ${def.title}`}>
            <GripVertical size={14} aria-hidden="true" />
          </button>
        )}
        <h3 className={s.title}>{def.title}</h3>
        <div className={s.tools}>
          {HeaderTools && <HeaderTools />}
          {def.Sheet && (
            <IconButton size="sm" label={`${def.title} settings`} active={editing} icon={<Settings size={14} />} data-sheet-trigger
              onPointerDown={e => e.stopPropagation()} onClick={onOpenSheet} />
          )}
          {menu}
        </div>
      </header>
      <div className={s.face}><Face /></div>
    </article>
  );
};
