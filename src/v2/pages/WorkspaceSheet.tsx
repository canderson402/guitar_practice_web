import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { useShallow } from 'zustand/react/shallow';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Trash2, X, Plus, GripVertical } from 'lucide-react';
import s from './WorkspaceSheet.module.css';
import { SideSheet, IconButton, Button, Dialog } from '../ui';
import { useV2Store, cardsIn } from '../state/useV2Store';
import { getCard, CARDS } from '../cards/registry';
import { moveInRow, moveToRow, moveRowBy } from '../cards/rows';
import { ROW, CARD, NEW_ROW, resolveDrop, rowDragCollision, centerOnPointer } from './rowDnd';

const spanOf = (id: string) => getCard(id)?.size.colSpan;

/** A row in the panel: dragged by its grip (a small "Row N" bubble follows
 *  the pointer; the row itself stays put, so nothing is resized); also a drop
 *  target — rows reorder onto it, and a card dropped on its empty space joins its end. */
const SheetRow: React.FC<{ r: number; children(handle: React.ReactNode): React.ReactNode }> = ({ r, children }) => {
  const drag = useDraggable({ id: ROW(r) });
  const drop = useDroppable({ id: ROW(r) });
  const handle = (
    <button type="button" ref={drag.setActivatorNodeRef} className={s.grip} aria-label={`Drag row ${r + 1}`} {...drag.attributes} {...drag.listeners}>
      <GripVertical size={14} aria-hidden="true" />
    </button>
  );
  const ref = (node: HTMLDivElement | null) => { drag.setNodeRef(node); drop.setNodeRef(node); };
  return (
    <div ref={ref} role="group" aria-label={`Row ${r + 1}`} className={[s.row, drop.isOver && !drag.isDragging ? s.over : ''].join(' ')}
      style={{ opacity: drag.isDragging ? 0.4 : 1 }}>
      {children(handle)}
    </div>
  );
};

/** A card in the panel: dragged by its grip to another row (a bubble with its
 *  name follows the pointer); also a drop target (drop a card on it to go
 *  before it, or trade places when full). */
const SheetCard: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => {
  const drag = useDraggable({ id: CARD(id) });
  const drop = useDroppable({ id: CARD(id) });
  const ref = (node: HTMLDivElement | null) => { drag.setNodeRef(node); drop.setNodeRef(node); };
  return (
    <div ref={ref} className={[s.card, drop.isOver && !drag.isDragging ? s.over : ''].join(' ')} style={{ opacity: drag.isDragging ? 0.4 : 1 }}>
      <button type="button" ref={drag.setActivatorNodeRef} className={s.grip} aria-label={`Drag ${title}`} {...drag.attributes} {...drag.listeners}>
        <GripVertical size={14} aria-hidden="true" />
      </button>
      {children}
    </div>
  );
};

const NewRowZone: React.FC = () => {
  const { setNodeRef, isOver } = useDroppable({ id: NEW_ROW });
  return <div ref={setNodeRef} className={[s.newRow, isOver ? s.over : ''].join(' ')}>Drop a card here for a new row</div>;
};

/** Edit the active workspace: its name and how its cards are arranged in rows. */
export const WorkspaceSheet: React.FC = () => {
  const st = useV2Store(useShallow(x => ({
    open: x.overlay?.kind === 'workspace',
    ws: x.workspaces.find(w => w.id === x.activeWorkspaceId),
    setOverlay: x.setOverlay, rename: x.renameWorkspace, setRows: x.setRows, remove: x.removeWorkspace,
    removeCard: x.removeCard,
  })));
  const [name, setName] = useState(st.ws?.name ?? '');
  // Which row's "Add card" list is open.
  const [adding, setAdding] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => setName(st.ws?.name ?? ''), [st.ws?.id, st.ws?.name]);

  if (!st.ws) return null;
  const ws = st.ws;
  const available = CARDS.filter(c => !cardsIn(ws).includes(c.id));
  // Only built cards are shown and arranged (setRows keeps the rest). An empty
  // workspace shows one empty row so there's always somewhere to add a card.
  const built = ws.rows.map(r => r.filter(id => getCard(id))).filter(r => r.length > 0);
  const rows = built.length ? built : [[]];
  const apply = (next: string[][]) => st.setRows(ws.id, next);
  const title = (id: string) => getCard(id)?.title ?? id;
  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(null);
    const next = resolveDrop(rows, String(a.id), over ? String(over.id) : null, spanOf);
    if (next !== rows) apply(next);
  };
  const preview = active?.startsWith('card:') ? title(active.slice(5)) : active ? `Row ${Number(active.slice(4)) + 1}` : null;
  // The panel slides in with a transform, which would offset a floating
  // preview inside it — so the preview is drawn in the app root.
  const overlayRoot = document.querySelector('.gp2') ?? document.body;
  const addTo = (target: number, id: string) => {
    apply(rows.map((r, k) => (k === target ? [...r, id] : r)));
    setAdding(null);
  };

  return (
    <>
      <SideSheet open={st.open} onClose={() => st.setOverlay(null)} title="Edit workspace">
        <label className={s.field}>
          <span className={s.label}>Name</span>
          <input aria-label="Workspace name" className={s.input} value={name}
            onChange={e => setName(e.target.value)} onBlur={() => st.rename(ws.id, name)}
            onKeyDown={e => { if (e.key === 'Enter') { st.rename(ws.id, name); (e.target as HTMLInputElement).blur(); } }} />
        </label>

        <DndContext sensors={sensors} collisionDetection={rowDragCollision}
          onDragStart={e => setActive(String(e.active.id))} onDragCancel={() => setActive(null)} onDragEnd={onDragEnd}>
          <div className={s.field}>
            {rows.map((row, r) => {
              const label = `Add card to row ${r + 1}`;
              // Rows hold 12 columns: only offer cards that fit what's left.
              const left = 12 - row.reduce((n, id) => n + (getCard(id)?.size.colSpan ?? 0), 0);
              const fitting = available.filter(c => c.size.colSpan <= left);
              return (
                <SheetRow key={row.join('|') || 'empty'} r={r}>{handle => (<>
                  <div className={s.rowHead}>
                    {handle}
                    <span className={s.grow} />
                    <IconButton size="sm" label={`Move row ${r + 1} up`} icon={<ChevronUp size={14} />} disabled={r === 0} onClick={() => apply(moveRowBy(rows, r, -1))} />
                    <IconButton size="sm" label={`Move row ${r + 1} down`} icon={<ChevronDown size={14} />} disabled={r === rows.length - 1} onClick={() => apply(moveRowBy(rows, r, 1))} />
                  </div>
                  {row.map((id, i) => (
                    <SheetCard key={id} id={id} title={title(id)}>
                      <span className={s.cardTitle}>{title(id)}</span>
                      <IconButton size="sm" label={`Move ${title(id)} left`} icon={<ChevronLeft size={14} />} disabled={i === 0} onClick={() => apply(moveInRow(rows, r, i, -1))} />
                      <IconButton size="sm" label={`Move ${title(id)} right`} icon={<ChevronRight size={14} />} disabled={i === row.length - 1} onClick={() => apply(moveInRow(rows, r, i, 1))} />
                      <IconButton size="sm" label={`Move ${title(id)} up a row`} icon={<ArrowUp size={14} />} disabled={r === 0 && row.length === 1} onClick={() => apply(moveToRow(rows, r, i, -1, spanOf))} />
                      <IconButton size="sm" label={`Move ${title(id)} down a row`} icon={<ArrowDown size={14} />} disabled={r === rows.length - 1 && row.length === 1} onClick={() => apply(moveToRow(rows, r, i, 1, spanOf))} />
                      <IconButton size="sm" label={`Remove ${title(id)}`} icon={<X size={14} />} onClick={() => st.removeCard(ws.id, id)} />
                    </SheetCard>
                  ))}
                  {left > 0 && (
                    <div className={s.add}>
                      <Button size="sm" variant="ghost" aria-label={label} aria-expanded={adding === r} disabled={fitting.length === 0}
                        onClick={() => setAdding(adding === r ? null : r)}>
                        <Plus size={14} />Add card
                      </Button>
                      {adding === r && (
                        <div role="menu" aria-label={label} className={s.menu}>
                          {fitting.map(c => (
                            <button key={c.id} type="button" role="menuitem" className={s.menuItem} onClick={() => addTo(r, c.id)}>{c.title}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>)}</SheetRow>
              );
            })}
            {rows.some(r => r.length > 0) && <NewRowZone />}
          </div>
          {createPortal(
            <DragOverlay dropAnimation={null} modifiers={[centerOnPointer]}>
              {preview ? <div className={s.dragPreview}>{preview}</div> : null}
            </DragOverlay>,
            overlayRoot,
          )}
        </DndContext>

        <Button variant="danger" onClick={() => setConfirmingDelete(true)}><Trash2 size={14} />Delete workspace</Button>
      </SideSheet>
      <Dialog open={confirmingDelete} onClose={() => setConfirmingDelete(false)} title="Delete workspace?">
        <p className={s.confirmText}>“{ws.name}” and its card layout will be removed.</p>
        <div className={s.confirmActions}>
          <Button onClick={() => setConfirmingDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => { setConfirmingDelete(false); st.remove(ws.id); }}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
};
