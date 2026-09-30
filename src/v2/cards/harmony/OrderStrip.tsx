import React from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, Modifier, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import s from './Harmony.module.css';
import { useStore } from '../../../store/useStore';
import type { ResolvedPair } from './harmonyModel';

/** Chips move along the strip only: vertical pointer movement is ignored. */
export const lockToHorizontal: Modifier = ({ transform }) => ({ ...transform, y: 0 });

/** Dropping one chip on another trades their places: [from, to], or null. */
export const swapForDrop = (ids: string[], active: string, over: string | null): [number, number] | null =>
  over && over !== active ? [ids.indexOf(active), ids.indexOf(over)] : null;

/** One chip: the play-order number and the note. Drag it onto another to swap. */
const Pair: React.FC<{ p: ResolvedPair; order: number; current: boolean }> = ({ p, order, current }) => {
  const drag = useDraggable({ id: p.key });
  const drop = useDroppable({ id: p.key });
  return (
    <li ref={drop.setNodeRef} aria-current={current ? 'step' : undefined}
      className={[s.pair, current ? s.current : '', drop.isOver && !drag.isDragging ? s.over : ''].join(' ')}>
      <button type="button" ref={drag.setNodeRef} className={s.chip} {...drag.attributes} {...drag.listeners}
        aria-label={`Note ${order}, ${p.baseName} — drag onto another note to swap`}
        style={{ transform: CSS.Translate.toString(drag.transform), opacity: drag.isDragging ? 0.7 : 1, zIndex: drag.isDragging ? 2 : undefined }}>
        <b className={s.order}>{order}</b><span className={s.base}>{p.baseName}</span>
      </button>
    </li>
  );
};

/** Your notes in play order. Drop a chip on another to trade their places. */
export const OrderStrip: React.FC<{ pairs: ResolvedPair[]; current?: number | null }> = ({ pairs, current = null }) => {
  const swap = useStore(x => x.swapNotes);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const ids = pairs.map(p => p.key);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const move = swapForDrop(ids, String(active.id), over ? String(over.id) : null);
    if (move) swap(move[0], move[1]);
  };
  if (pairs.length === 0) return <p className={s.empty}>Click any fret to add a note — its harmony appears in the key.</p>;
  return (
    // No vertical auto-scroll: dragging a chip never scrolls the page.
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}
      modifiers={[lockToHorizontal]} autoScroll={{ threshold: { x: 0.2, y: 0 } }}>
      <div className={s.stripRow}>
        <span className={s.stripLabel}>Order</span>
        <ol aria-label="Order" className={s.strip}>
          {pairs.map((p, i) => <Pair key={p.key} p={p} order={i + 1} current={i === current} />)}
        </ol>
      </div>
    </DndContext>
  );
};
