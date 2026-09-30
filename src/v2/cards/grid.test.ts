import { columnsForWidth, clampSpan, designedHeight, fitRowStyle, rowLines } from './grid';

it('picks columns per breakpoint', () => {
  expect(columnsForWidth(1440)).toBe(12);
  expect(columnsForWidth(1200)).toBe(12);
  expect(columnsForWidth(1199)).toBe(8);
  expect(columnsForWidth(768)).toBe(8);
  expect(columnsForWidth(767)).toBe(1);
});

it('clamps spans to the column count', () => {
  expect(clampSpan(12, 8)).toBe(8);
  expect(clampSpan(6, 8)).toBe(6);
  expect(clampSpan(3, 1)).toBe(1);
  expect(clampSpan(4, 12)).toBe(4);
});


const small = { colSpan: 3 as const, rowSpan: 6 };
const wide = { colSpan: 12 as const, rowSpan: 9 };

it('packs a row\'s cards into lines the way the grid wraps them', () => {
  expect(rowLines([small, small, small], 12)).toEqual([6]);
  expect(rowLines([small, small, small, small, small], 12)).toEqual([6, 6]);
  expect(rowLines([small, small, small], 8)).toEqual([6, 6]); // 2 per line at 8 columns
  expect(rowLines([small, wide], 12)).toEqual([6, 9]);
  expect(rowLines([], 12)).toEqual([]);
});

it('a row is exactly its lines\' designed heights — it neither squeezes nor stretches', () => {
  expect(designedHeight(6)).toBe(6 * 40 + 5 * 12);
  expect(fitRowStyle([6])).toEqual({ flex: '0 0 auto', height: designedHeight(6) });
  // A wrapped row grows to hold both lines, pushing later rows down.
  expect(fitRowStyle([6, 9])).toEqual({ flex: '0 0 auto', height: designedHeight(6) + 12 + designedHeight(9) });
});
