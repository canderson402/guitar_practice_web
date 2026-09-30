import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Trash2, X, Plus } from 'lucide-react';
import s from './WorkspaceSheet.module.css';
import { SideSheet, IconButton, Button } from '../ui';
import { useV2Store, cardsIn } from '../state/useV2Store';
import { getCard, CARDS } from '../cards/registry';
import { moveInRow, moveToRow, moveRowBy } from '../cards/rows';

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
  const addTo = (target: number, id: string) => {
    apply(rows.map((r, k) => (k === target ? [...r, id] : r)));
    setAdding(null);
  };

  return (
    <SideSheet open={st.open} onClose={() => st.setOverlay(null)} title="Edit workspace">
      <label className={s.field}>
        <span className={s.label}>Name</span>
        <input aria-label="Workspace name" className={s.input} value={name}
          onChange={e => setName(e.target.value)} onBlur={() => st.rename(ws.id, name)}
          onKeyDown={e => { if (e.key === 'Enter') { st.rename(ws.id, name); (e.target as HTMLInputElement).blur(); } }} />
      </label>

      <div className={s.field}>
        {rows.map((row, r) => {
          const label = `Add card to row ${r + 1}`;
          // Rows hold 12 columns: only offer cards that fit what's left.
          const left = 12 - row.reduce((n, id) => n + (getCard(id)?.size.colSpan ?? 0), 0);
          const fitting = available.filter(c => c.size.colSpan <= left);
          return (
            <div key={row.join('|') || 'empty'} role="group" aria-label={`Row ${r + 1}`} className={s.row}>
              <div className={s.rowHead}>
                <span className={s.rowTitle}>Row {r + 1}</span>
                <IconButton size="sm" label={`Move row ${r + 1} up`} icon={<ChevronUp size={14} />} disabled={r === 0} onClick={() => apply(moveRowBy(rows, r, -1))} />
                <IconButton size="sm" label={`Move row ${r + 1} down`} icon={<ChevronDown size={14} />} disabled={r === rows.length - 1} onClick={() => apply(moveRowBy(rows, r, 1))} />
              </div>
              {row.map((id, i) => (
                <div key={id} className={s.card}>
                  <span className={s.cardTitle}>{title(id)}</span>
                  <IconButton size="sm" label={`Move ${title(id)} left`} icon={<ChevronLeft size={14} />} disabled={i === 0} onClick={() => apply(moveInRow(rows, r, i, -1))} />
                  <IconButton size="sm" label={`Move ${title(id)} right`} icon={<ChevronRight size={14} />} disabled={i === row.length - 1} onClick={() => apply(moveInRow(rows, r, i, 1))} />
                  <IconButton size="sm" label={`Move ${title(id)} up a row`} icon={<ArrowUp size={14} />} disabled={r === 0 && row.length === 1} onClick={() => apply(moveToRow(rows, r, i, -1))} />
                  <IconButton size="sm" label={`Move ${title(id)} down a row`} icon={<ArrowDown size={14} />} disabled={r === rows.length - 1 && row.length === 1} onClick={() => apply(moveToRow(rows, r, i, 1))} />
                  <IconButton size="sm" label={`Remove ${title(id)}`} icon={<X size={14} />} onClick={() => st.removeCard(ws.id, id)} />
                </div>
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
            </div>
          );
        })}
      </div>

      <Button variant="danger" onClick={() => st.remove(ws.id)}><Trash2 size={14} />Delete workspace</Button>
    </SideSheet>
  );
};
