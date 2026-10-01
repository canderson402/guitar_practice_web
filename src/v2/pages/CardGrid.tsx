import React, { useEffect, useState } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import s from './PracticePage.module.css';
import { CardFrame } from '../cards/CardFrame';
import { CardDef, getCard } from '../cards/registry';
import { ROW, CARD, NEW_ROW, resolveDrop, rowDragCollision, centerOnPointer } from './rowDnd';
import { clampSpan, columnsForWidth, designedHeight, fitRowStyle, rowLines } from '../cards/grid';
import { useV2Store } from '../state/useV2Store';
import { CardMenu } from './CardMenu';

const useColumns = () => {
  const [cols, setCols] = useState(() => columnsForWidth(window.innerWidth));
  useEffect(() => {
    const onResize = () => setCols(columnsForWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return cols;
};

/** A card on the grid: dragged by its header to another row; also a drop
 *  target (drop on it to go before it, or trade places when its row is full). */
const GridCard: React.FC<{ def: CardDef; columns: number; fit: boolean }> = ({ def, columns, fit }) => {
  const drag = useDraggable({ id: CARD(def.id) });
  const drop = useDroppable({ id: CARD(def.id) });
  const overlay = useV2Store(st => st.overlay);
  const setOverlay = useV2Store(st => st.setOverlay);
  const editing = overlay?.kind === 'cardSheet' && overlay.cardId === def.id;
  return (
    <div ref={drop.setNodeRef} className={[s.cell, drop.isOver && !drag.isDragging ? s.dropTarget : ''].join(' ')}
      style={{
        gridColumn: `span ${clampSpan(def.size.colSpan, columns)}`,
        gridRow: fit ? undefined : `span ${def.size.rowSpan}`,
        // The original stays put (dimmed) while a preview follows the pointer.
        opacity: drag.isDragging ? 0.35 : 1,
      }}>
      <CardFrame def={def} editing={editing}
        onOpenSheet={() => setOverlay(editing ? null : { kind: 'cardSheet', cardId: def.id })}
        menu={<CardMenu cardId={def.id} title={def.title} />}
        drag={{ attributes: drag.attributes, listeners: drag.listeners, setActivatorNodeRef: drag.setNodeRef }} />
    </div>
  );
};

/** A row: a drop target for rows (reorder) and cards (join its end), with a
 *  grip on its left edge to drag the whole row. */
const GridRow: React.FC<{ r: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ r, style, children }) => {
  const drag = useDraggable({ id: ROW(r) });
  const drop = useDroppable({ id: ROW(r) });
  return (
    <div ref={drop.setNodeRef} role="group" aria-label={`Row ${r + 1}`} style={{ ...style, opacity: drag.isDragging ? 0.35 : 1 }}
      className={[s.row, drop.isOver && !drag.isDragging ? s.dropTarget : ''].join(' ')}>
      <button type="button" ref={drag.setNodeRef} className={s.rowGrip} aria-label={`Drag row ${r + 1}`} {...drag.attributes} {...drag.listeners}>
        <GripVertical size={14} aria-hidden="true" />
      </button>
      {children}
    </div>
  );
};

const NewRowZone: React.FC = () => {
  const { setNodeRef, isOver } = useDroppable({ id: NEW_ROW });
  return <div ref={setNodeRef} className={[s.newRow, isOver ? s.dropTarget : ''].join(' ')}>New row</div>;
};

const spanOf = (id: string) => getCard(id)?.size.colSpan;

/** The workspace's rows. Cards drag to other rows (or a new row) and rows
 *  drag to reorder, with the same rules as the workspace panel. On
 *  tablet/desktop each row is exactly its cards' designed height (cards on a
 *  line share it; a row that wraps grows by a line); on phones cards keep
 *  their own designed heights. */
export const CardGrid: React.FC<{ workspaceId: string; rows: CardDef[][] }> = ({ workspaceId, rows }) => {
  const columns = useColumns();
  const fit = columns > 1;
  const setRows = useV2Store(st => st.setRows);
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const ids = rows.map(r => r.map(c => c.id));
  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(null);
    const next = resolveDrop(ids, String(a.id), over ? String(over.id) : null, spanOf);
    if (next !== ids) setRows(workspaceId, next);
  };
  const preview = active?.startsWith('card:') ? getCard(active.slice(5))?.title : active ? `Row ${Number(active.slice(4)) + 1}` : null;

  return (
    <DndContext sensors={sensors} collisionDetection={rowDragCollision}
      onDragStart={e => setActive(String(e.active.id))} onDragCancel={() => setActive(null)} onDragEnd={onDragEnd}>
      <div className={[s.rows, fit ? s.fit : ''].join(' ')}>
        {rows.map((row, i) => {
          const lines = rowLines(row.map(c => c.size), columns);
          return (
            <GridRow key={ids[i].join('|')} r={i} style={fit ? fitRowStyle(lines) : undefined}>
              <div className={s.grid} style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                // Each wrapped line is its own tallest card's height.
                gridTemplateRows: fit ? lines.map(l => `${designedHeight(l)}px`).join(' ') : undefined,
              }}>
                {row.map(def => <GridCard key={def.id} def={def} columns={columns} fit={fit} />)}
              </div>
            </GridRow>
          );
        })}
        {active?.startsWith('card:') && <NewRowZone />}
      </div>
      <DragOverlay dropAnimation={null} modifiers={[centerOnPointer]}>
        {preview ? <div className={s.dragPreview}>{preview}</div> : null}
      </DragOverlay>
    </DndContext>
  );
};
