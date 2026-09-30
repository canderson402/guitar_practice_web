import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil } from 'lucide-react';
import { dragIndices } from './workspaceDrag';
import s from './PracticePage.module.css';
import { Tabs, IconButton, Button } from '../ui';
import { useV2Store } from '../state/useV2Store';

/** Pointer-drag wrapper around a tab. Keyboard stays with the tablist's
 *  arrow-key selection, so only the pointer sensor is used here. */
const SortableTab: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const { role: _role, tabIndex: _tabIndex, ...dragAttrs } = attributes;
  return (
    <span ref={setNodeRef} {...dragAttrs} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition, display: 'inline-flex' }}>
      {children}
    </span>
  );
};

export const WorkspaceTabs: React.FC<{ onAddCard(): void }> = ({ onAddCard }) => {
  const st = useV2Store(useShallow(x => ({
    workspaces: x.workspaces, activeWorkspaceId: x.activeWorkspaceId,
    setActiveWorkspace: x.setActiveWorkspace, addWorkspace: x.addWorkspace, renameWorkspace: x.renameWorkspace,
    setOverlay: x.setOverlay,
    reorderWorkspaces: x.reorderWorkspaces,
  })));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = st.workspaces.map(w => w.id);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const move = dragIndices(ids, String(active.id), over ? String(over.id) : null);
    if (move) st.reorderWorkspaces(move.from, move.to);
  };
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startRename = (id: string, name: string) => { setRenaming(id); setDraft(name); };
  const commit = () => { if (renaming) st.renameWorkspace(renaming, draft); setRenaming(null); };

  return (
    <div className={s.tabsRow}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
      <Tabs label="Workspaces" activeId={st.activeWorkspaceId} onSelect={st.setActiveWorkspace}
        items={st.workspaces.map(w => ({ id: w.id, label: w.name }))}
        renderItem={(item, _active, node) => item.id === renaming ? (
          <input autoFocus aria-label="Workspace name" className={s.renameInput} value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commit(); if (e.key === 'Escape') setRenaming(null); }} />
        ) : (
          <SortableTab id={item.id}>
            <span onDoubleClick={() => startRename(item.id, String(item.label))}>{node}</span>
          </SortableTab>
        )}
        trailing={
          <IconButton size="sm" label="New workspace" icon={<Plus size={14} />} data-sheet-trigger
            onClick={() => { const id = st.addWorkspace(); st.setActiveWorkspace(id); st.setOverlay({ kind: 'workspace' }); }} />
        } />
      </SortableContext>
      </DndContext>
      <div className={s.tabTools}>
        <IconButton size="sm" label="Edit workspace" icon={<Pencil size={14} />} data-sheet-trigger onClick={() => st.setOverlay({ kind: 'workspace' })} />
        <Button size="sm" onClick={onAddCard}><Plus size={14} />Add card</Button>
      </div>
    </div>
  );
};
