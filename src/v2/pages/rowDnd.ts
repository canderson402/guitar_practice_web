import { closestCenter, pointerWithin, CollisionDetection, Modifier } from '@dnd-kit/core';
import { getEventCoordinates } from '@dnd-kit/utilities';
import { dropCard, moveRow } from '../cards/rows';

// Drag ids shared by the workspace panel and the Practice grid.
export const ROW = (r: number) => `row:${r}`;
export const CARD = (id: string) => `card:${id}`;
export const NEW_ROW = 'newrow';

const isRow = (id: string) => id.startsWith('row:');
const isCard = (id: string) => id.startsWith('card:');
const rowIndex = (id: string) => Number(id.slice(4));
const cardId = (id: string) => id.slice(5);

/** Rows after dropping `active` on `over` (same array if nothing changes):
 *  a card on a card (reorder / move before it / trade places when full), a
 *  card on a row (to its end), a card on the new-row gap, a row on a row. */
export const resolveDrop = (
  rows: string[][], active: string, over: string | null, spanOf: (id: string) => number | undefined,
): string[][] => {
  if (!over || over === active) return rows;
  const rowOf = (id: string) => rows.findIndex(r => r.includes(id));
  if (isRow(active)) {
    const to = isRow(over) ? rowIndex(over) : isCard(over) ? rowOf(cardId(over)) : -1;
    return to < 0 || to === rowIndex(active) ? rows : moveRow(rows, rowIndex(active), to);
  }
  if (!isCard(active)) return rows;
  const id = cardId(active);
  if (over === NEW_ROW) return dropCard(rows, id, { kind: 'newRow', at: rows.length }, spanOf);
  if (isRow(over)) {
    const r = rowIndex(over);
    if (!rows[r]) return rows;
    const index = rows[r].includes(id) ? rows[r].length - 1 : rows[r].length;
    return dropCard(rows, id, { kind: 'card', row: r, index }, spanOf);
  }
  const target = cardId(over);
  const r = rowOf(target);
  return r < 0 ? rows : dropCard(rows, id, { kind: 'card', row: r, index: rows[r].indexOf(target) }, spanOf);
};

/** Drag-preview modifier: centers the preview on the pointer. The preview
 *  starts at the dragged element's corner, so without this a tall row grip
 *  would show it mid-strip instead of under the mouse. */
export const centerOnPointer: Modifier = ({ transform, activatorEvent, activeNodeRect, overlayNodeRect }) => {
  const pointer = activatorEvent ? getEventCoordinates(activatorEvent) : null;
  if (!pointer || !activeNodeRect || !overlayNodeRect) return transform;
  return {
    ...transform,
    x: transform.x + pointer.x - activeNodeRect.left - overlayNodeRect.width / 2,
    y: transform.y + pointer.y - activeNodeRect.top - overlayNodeRect.height / 2,
  };
};

/** Rows only collide with rows; a dragged card prefers the card under the
 *  pointer over the row around it (falls back to the nearest target). */
export const rowDragCollision: CollisionDetection = args => {
  const active = String(args.active.id);
  const pool = args.droppableContainers.filter(c => {
    const id = String(c.id);
    return id !== active && (isRow(active) ? isRow(id) : true);
  });
  const hits = pointerWithin({ ...args, droppableContainers: pool });
  const found = hits.length ? hits : closestCenter({ ...args, droppableContainers: pool });
  if (isCard(active)) {
    const card = found.find(h => isCard(String(h.id)));
    if (card) return [card];
  }
  return found.slice(0, 1);
};
