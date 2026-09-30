/** Store indices for a tab drag, or null when the drop changes nothing. */
export const dragIndices = (
  ids: string[], activeId: string, overId: string | null,
): { from: number; to: number } | null => {
  if (!overId || overId === activeId) return null;
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  return from < 0 || to < 0 ? null : { from, to };
};
