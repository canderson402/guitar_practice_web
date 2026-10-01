import React from 'react';
import { SideSheet } from '../ui';
import { useV2Store, cardsIn } from '../state/useV2Store';
import { getCard } from './registry';

/** Renders the open card's Sheet. Closes itself if the card is gone (removed,
 *  unregistered, or not in the active workspace). */
export const CardSheetHost: React.FC = () => {
  const overlay = useV2Store(s => s.overlay);
  const setOverlay = useV2Store(s => s.setOverlay);
  const active = useV2Store(s => s.workspaces.find(w => w.id === s.activeWorkspaceId));
  const cardId = overlay?.kind === 'cardSheet' ? overlay.cardId : null;
  const def = cardId ? getCard(cardId) : undefined;
  const valid = !!def?.Sheet && !!active && cardsIn(active).includes(cardId!);
  if (!cardId || !valid) return null;
  const Sheet = def!.Sheet!;
  // Open on the side away from the card so it stays visible while editing.
  const el = document.querySelector(`[data-card-id="${cardId}"]`);
  const rect = el?.getBoundingClientRect();
  const side = rect && rect.left + rect.width / 2 > window.innerWidth / 2 ? 'left' : 'right';
  return (
    <SideSheet open side={side} onClose={() => setOverlay(null)} title={def!.title}>
      <Sheet />
    </SideSheet>
  );
};
