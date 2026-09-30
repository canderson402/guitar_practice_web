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

/** Move card `i` of row `r` to the row above (-1) or below (+1). Past the
 *  first/last row it starts a new row there (unless it's already alone). */
export const moveToRow = (rows: string[][], r: number, i: number, dir: -1 | 1): string[][] => {
  const id = rows[r][i];
  const alone = rows[r].length === 1;
  const target = r + dir;
  if (alone && (target < 0 || target >= rows.length)) return rows;
  const next = rows.map(row => [...row]);
  next[r].splice(i, 1);
  if (target < 0) next.unshift([id]);
  else if (target >= rows.length) next.push([id]);
  else next[target].push(id);
  return clean(next);
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
