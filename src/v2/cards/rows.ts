import { clampSpan } from './grid';

/** Pack cards into rows in order: each row fills left to right until the
 *  next card doesn't fit. This is the layout the Practice grid shows. */
export const packRows = (cards: Array<{ id: string; colSpan: number }>, columns: number): string[][] => {
  const rows: string[][] = [];
  let used = columns;   // forces a new row for the first card
  cards.forEach(({ id, colSpan }) => {
    const span = clampSpan(colSpan as 3 | 4 | 6 | 12, columns);
    if (used + span > columns) { rows.push([]); used = 0; }
    rows[rows.length - 1].push(id);
    used += span;
  });
  return rows;
};

/** Split any row whose cards need more than `columns` columns: what doesn't
 *  fit moves to a new row right after it (order kept). A full-width card is
 *  therefore always alone in its row. Unknown cards (no span) take no room. */
export const splitOverfullRows = (rows: string[][], spanOf: (id: string) => number | undefined, columns = 12): string[][] =>
  rows.flatMap(row => {
    const out: string[][] = [[]];
    let used = 0;
    row.forEach(id => {
      const span = Math.min(spanOf(id) ?? 0, columns);
      if (used + span > columns && out[out.length - 1].length > 0) { out.push([]); used = 0; }
      out[out.length - 1].push(id);
      used += span;
    });
    return out;
  });

const clean = (rows: string[][]): string[][] => rows.filter(r => r.length > 0);
const swap = <T,>(arr: T[], a: number, b: number): T[] => {
  if (b < 0 || b >= arr.length) return arr;
  const next = [...arr];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};

/** Move card `i` of row `r` one place left (-1) or right (+1). */
export const moveInRow = (rows: string[][], r: number, i: number, dir: -1 | 1): string[][] =>
  rows.map((row, k) => (k === r ? swap(row, i, i + dir) : row));

type SpanOf = (id: string) => number | undefined;
const used = (row: string[], spanOf: SpanOf) => row.reduce((n, id) => n + (spanOf(id) ?? 0), 0);
const fits = (row: string[], spanOf: SpanOf, columns = 12) => used(row, spanOf) <= columns;

/** Move card `i` of row `r` to the row above (-1) or below (+1). Past the
 *  first/last row it starts a new row there (unless it's already alone).
 *  With `spanOf`, it only joins a row it fits in (12 columns): otherwise it
 *  gets its own row in between — or, if it was alone, the rows swap. */
export const moveToRow = (rows: string[][], r: number, i: number, dir: -1 | 1, spanOf?: SpanOf): string[][] => {
  const id = rows[r][i];
  const alone = rows[r].length === 1;
  const target = r + dir;
  if (alone && (target < 0 || target >= rows.length)) return rows;
  const next = rows.map(row => [...row]);
  next[r].splice(i, 1);
  if (target < 0) next.unshift([id]);
  else if (target >= rows.length) next.push([id]);
  else if (!spanOf || fits([...next[target], id], spanOf)) next[target].push(id);
  else if (alone) return moveRowBy(rows, r, dir);
  else next.splice(dir < 0 ? r : r + 1, 0, [id]);
  return clean(next);
};

export type Drop = { kind: 'card'; row: number; index: number } | { kind: 'newRow'; at: number };

/** Drop a dragged card. On a card in the same row: reorder. On a card in
 *  another row: go before it if the row has room, otherwise trade places with
 *  it (when both rows still fit), otherwise no change. On a "new row" gap:
 *  start a row there. Emptied rows disappear. */
export const dropCard = (rows: string[][], id: string, drop: Drop, spanOf: SpanOf, columns = 12): string[][] => {
  const from = rows.findIndex(row => row.includes(id));
  if (from < 0) return rows;
  const fromIdx = rows[from].indexOf(id);
  const next = rows.map(row => [...row]);
  if (drop.kind === 'newRow') {
    next[from].splice(fromIdx, 1);
    next.splice(drop.at, 0, [id]);
    return clean(next);
  }
  if (drop.row === from) {
    next[from].splice(fromIdx, 1);
    next[from].splice(drop.index, 0, id);
    return next;
  }
  const target = next[drop.row];
  if (fits([...target, id], spanOf, columns)) {
    next[from].splice(fromIdx, 1);
    target.splice(drop.index, 0, id);
    return clean(next);
  }
  const other = target[drop.index];
  if (other === undefined) return rows;
  next[from][fromIdx] = other;
  target[drop.index] = id;
  return fits(next[from], spanOf, columns) && fits(target, spanOf, columns) ? next : rows;
};

/** Drag row `from` to position `to`. */
export const moveRow = (rows: string[][], from: number, to: number): string[][] => {
  const next = [...rows];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
};

/** Move row `r` up (-1) or down (+1). */
export const moveRowBy = (rows: string[][], r: number, dir: -1 | 1): string[][] => swap(rows, r, r + dir);

/** Convert a legacy flat card list into rows: full-width cards get their own row. */
export const rowsFromFlat = (cards: string[], fullWidth: string[]): string[][] => {
  const rows: string[][] = [];
  let current: string[] = [];
  cards.forEach(id => {
    if (fullWidth.includes(id)) {
      if (current.length) rows.push(current);
      rows.push([id]);
      current = [];
    } else current.push(id);
  });
  if (current.length) rows.push(current);
  return rows;
};
