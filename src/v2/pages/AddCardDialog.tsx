import React from 'react';
import s from './PracticePage.module.css';
import { Dialog } from '../ui';
import { CARDS } from '../cards/registry';
import { useV2Store, cardsIn } from '../state/useV2Store';

const SIZE_LABEL: Record<number, string> = { 3: 'Small', 4: 'Medium', 6: 'Large', 12: 'Full width' };

export const AddCardDialog: React.FC<{ open: boolean; onClose(): void }> = ({ open, onClose }) => {
  const active = useV2Store(st => st.workspaces.find(w => w.id === st.activeWorkspaceId));
  const addCard = useV2Store(st => st.addCard);
  if (!active) return null;
  const available = CARDS.filter(c => !cardsIn(active).includes(c.id));
  return (
    <Dialog open={open} onClose={onClose} title="Add card">
      {available.length === 0 ? <p className={s.muted}>Every available card is already in this workspace.</p> : (
        <div className={s.pickList}>
          {available.map(c => (
            <button key={c.id} type="button" className={s.pickItem} onClick={() => { addCard(active.id, c.id); onClose(); }}>
              <span className={s.pickTitle}>{c.title}</span>
              <span className={s.muted}>{c.description}</span>
              <span className={s.pickSize}>{SIZE_LABEL[c.size.colSpan]}</span>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
};
