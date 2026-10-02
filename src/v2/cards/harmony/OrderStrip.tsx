import React from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, Modifier, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import s from './Harmony.module.css';
import { ChipButton } from '../../ui';

/** Chips move along their row only: vertical pointer movement is ignored. */
export const lockToHorizontal: Modifier = ({ transform }) => ({ ...transform, y: 0 });

/** Dropping one chip on another trades their places: [from, to], or null. */
export const swapForDrop = (ids: string[], active: string, over: string | null): [number, number] | null =>
  over && over !== active ? [ids.indexOf(active), ids.indexOf(over)] : null;

export interface RowItem { id: string; note: string }

/** One chip: its number in this row and its note. Drag it onto another chip
 *  to swap them. */
const Item: React.FC<{ row: string; item: RowItem; order: number; current: boolean }> = ({ row, item, order, current }) => {
  const drag = useDraggable({ id: item.id });
  const drop = useDroppable({ id: item.id });
  return (
    <li ref={drop.setNodeRef} className={s.item} aria-current={current ? 'step' : undefined}>
      <ChipButton ref={drag.setNodeRef} {...drag.attributes} {...drag.listeners} className={s.chip}
        selected={current} target={drop.isOver && !drag.isDragging}
        aria-label={`${row} ${order}, ${item.note} — drag onto another to swap`}
        style={{ transform: CSS.Translate.toString(drag.transform), opacity: drag.isDragging ? 0.7 : 1, zIndex: drag.isDragging ? 2 : undefined }}>
        <b className={s.order}>{order}</b><span className={s.note}>{item.note}</span>
      </ChipButton>
    </li>
  );
};

/** A row of notes in play order (Melody or Harmony), with its own reordering. */
export const NoteRow: React.FC<{
  label: 'Melody' | 'Harmony'; items: RowItem[]; current: number | null; empty: string;
  onSwap(a: number, b: number): void;
}> = ({ label, items, current, empty, onSwap }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
  const ids = items.map(i => i.id);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const move = swapForDrop(ids, String(active.id), over ? String(over.id) : null);
    if (move) onSwap(move[0], move[1]);
  };
  return (
    <div className={s.row}>
      <span className={[s.rowLabel, label === 'Melody' ? s.melodyLabel : s.harmonyLabel].join(' ')}>{label}</span>
      {items.length === 0 ? <span className={s.empty}>{empty}</span> : (
        // No vertical auto-scroll: dragging a chip never scrolls the page.
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}
          modifiers={[lockToHorizontal]} autoScroll={{ threshold: { x: 0.2, y: 0 } }}>
          <ol aria-label={label} className={s.strip}>
            {items.map((item, i) => <Item key={item.id} row={label} item={item} order={i + 1} current={i === current} />)}
          </ol>
        </DndContext>
      )}
    </div>
  );
};
