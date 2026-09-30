import React, { useLayoutEffect, useState } from 'react';
import s from './PracticePage.module.css';
import { WorkspaceTabs } from './WorkspaceTabs';
import { CardGrid } from './CardGrid';
import { AddCardDialog } from './AddCardDialog';
import { WorkspaceSheet } from './WorkspaceSheet';
import { Button } from '../ui';
import { useV2Store } from '../state/useV2Store';
import { getCard, CardDef } from '../cards/registry';
import { ALL_CARDS_ROWS } from '../state/defaultWorkspace';
import { splitOverfullRows } from '../cards/rows';

const spanOf = (id: string) => getCard(id)?.size.colSpan;

export const PracticePage: React.FC = () => {
  const active = useV2Store(st => st.workspaces.find(w => w.id === st.activeWorkspaceId));
  const setRows = useV2Store(st => st.setRows);
  const addWorkspace = useV2Store(st => st.addWorkspace);
  const setActiveWorkspace = useV2Store(st => st.setActiveWorkspace);
  const setOverlay = useV2Store(st => st.setOverlay);
  const [adding, setAdding] = useState(false);

  // A row never holds more than fits (12 columns): overflow becomes a new row,
  // so full-width cards always sit alone. Saved, so the panel shows it too.
  useLayoutEffect(() => {
    if (!active) return;
    const split = splitOverfullRows(active.rows, spanOf);
    if (split.length !== active.rows.length) setRows(active.id, split);
  }, [active, setRows]);

  const createWorkspace = () => { const id = addWorkspace(); setActiveWorkspace(id); setOverlay({ kind: 'workspace' }); };

  // Every workspace deleted: invite the user to make one.
  if (!active) {
    return (
      <main className={s.page}>
        <WorkspaceTabs onAddCard={() => setAdding(true)} />
        <div className={s.empty}>
          <h2>No workspaces</h2>
          <p className={s.muted}>A workspace is a set of cards for a practice session.</p>
          <div className={s.emptyActions}>
            <Button variant="primary" onClick={createWorkspace}>Create a workspace</Button>
          </div>
        </div>
        <WorkspaceSheet />
      </main>
    );
  }
  // Unregistered ids stay in storage but aren't rendered; rows left empty are skipped.
  const rows = active.rows
    .map(r => r.map(getCard).filter((c): c is CardDef => !!c))
    .filter(r => r.length > 0);

  return (
    <main className={s.page}>
      <WorkspaceTabs onAddCard={() => setAdding(true)} />
      {rows.length === 0 ? (
        <div className={s.empty}>
          <h2>Nothing here yet</h2>
          <p className={s.muted}>Add the tools you want for this session.</p>
          <div className={s.emptyActions}>
            <Button variant="primary" onClick={() => setAdding(true)}>Add card</Button>
            <Button onClick={() => setRows(active.id, ALL_CARDS_ROWS)}>Add all cards</Button>
          </div>
        </div>
      ) : (
        <CardGrid workspaceId={active.id} rows={rows} />
      )}
      <AddCardDialog open={adding} onClose={() => setAdding(false)} />
      <WorkspaceSheet />
    </main>
  );
};
