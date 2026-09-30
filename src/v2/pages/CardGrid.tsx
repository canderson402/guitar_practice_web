import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, Modifier } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import s from './PracticePage.module.css';
import { CardFrame } from '../cards/CardFrame';
import { CardDef } from '../cards/registry';
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

// Cards drag left/right within their row only (rows are arranged in the
// workspace panel).
const lockToRow: Modifier = ({ transform }) => ({ ...transform, y: 0 });

const SortableCard: React.FC<{ def: CardDef; columns: number; draggable: boolean; fit: boolean }> = ({ def, columns, draggable, fit }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: def.id, disabled: !draggable });
  const overlay = useV2Store(st => st.overlay);
  const setOverlay = useV2Store(st => st.setOverlay);
  const editing = overlay?.kind === 'cardSheet' && overlay.cardId === def.id;
  return (
    <div ref={setNodeRef} className={s.cell}
      style={{
        gridColumn: `span ${clampSpan(def.size.colSpan, columns)}`,
        gridRow: fit ? undefined : `span ${def.size.rowSpan}`,
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 5 : undefined,
      }}>
      <CardFrame def={def} editing={editing}
        onOpenSheet={() => setOverlay(editing ? null : { kind: 'cardSheet', cardId: def.id })}
        menu={<CardMenu cardId={def.id} title={def.title} />}
        drag={draggable ? { attributes, listeners, setActivatorNodeRef } : undefined} />
    </div>
  );
};

/** The workspace's rows. On tablet/desktop each row is exactly its cards'
 *  designed height (cards on a line share it; a row that wraps grows by a
 *  line); on phones cards keep their own designed heights. */
export const CardGrid: React.FC<{ workspaceId: string; rows: CardDef[][] }> = ({ workspaceId, rows }) => {
  const columns = useColumns();
  const fit = columns > 1;
  const setRows = useV2Store(st => st.setRows);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = rows.map(r => r.map(c => c.id));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const r = ids.findIndex(row => row.includes(String(active.id)) && row.includes(String(over.id)));
    if (r < 0) return;
    const row = ids[r];
    setRows(workspaceId, ids.map((x, k) => (k === r ? arrayMove(row, row.indexOf(String(active.id)), row.indexOf(String(over.id))) : x)));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[lockToRow]} onDragEnd={onDragEnd}>
      <div className={[s.rows, fit ? s.fit : ''].join(' ')}>
        {rows.map((row, i) => {
          const lines = rowLines(row.map(c => c.size), columns);
          return (
            <div key={ids[i].join('|')} role="group" aria-label={`Row ${i + 1}`} className={s.row}
              style={fit ? fitRowStyle(lines) : undefined}>
              <SortableContext items={ids[i]} strategy={horizontalListSortingStrategy}>
                <div className={s.grid} style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  // Each wrapped line is its own tallest card's height.
                  gridTemplateRows: fit ? lines.map(l => `${designedHeight(l)}px`).join(' ') : undefined,
                }}>
                  {/* A card alone in its row has nothing to swap with: no drag handle. */}
                  {row.map(def => <SortableCard key={def.id} def={def} columns={columns} draggable={row.length > 1} fit={fit} />)}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};
