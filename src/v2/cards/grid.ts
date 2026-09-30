export type ColSpan = 3 | 4 | 6 | 12;

export const columnsForWidth = (px: number): 12 | 8 | 1 => (px >= 1200 ? 12 : px >= 768 ? 8 : 1);

export const clampSpan = (span: ColSpan, columns: number): number => Math.min(span, columns);

const ROW_UNIT = 40;
const GAP = 12;

/** Pixel height of a card `rowSpan` units tall (matches --row-unit / --grid-gap). */
export const designedHeight = (rowSpan: number): number => rowSpan * ROW_UNIT + (rowSpan - 1) * GAP;

/** The lines a row's cards wrap onto at `columns` wide (in order, like the
 *  grid places them), as each line's tallest rowSpan. */
export const rowLines = (cards: Array<{ colSpan: ColSpan; rowSpan: number }>, columns: number): number[] => {
  const lines: number[] = [];
  let used = columns;
  cards.forEach(c => {
    const span = clampSpan(c.colSpan, columns);
    if (used + span > columns) { lines.push(c.rowSpan); used = span; }
    else { lines[lines.length - 1] = Math.max(lines[lines.length - 1], c.rowSpan); used += span; }
  });
  return lines;
};

/** A row is exactly its lines' designed heights: never squeezed (cards can't
 *  overflow into the next row) and never stretched (a lone small card stays
 *  compact). A row whose cards wrap grows, pushing later rows down. */
export const fitRowStyle = (lines: number[]): { flex: string; height: number } =>
  ({ flex: '0 0 auto', height: lines.reduce((h, l, i) => h + designedHeight(l) + (i ? GAP : 0), 0) });
