import { resolveDrop, ROW, CARD, NEW_ROW, centerOnPointer } from './rowDnd';

const SPAN: Record<string, number> = { a: 3, b: 3, c: 3, full: 12 };
const spanOf = (id: string) => SPAN[id];
const rows = [['a', 'b'], ['c'], ['full']];

it('maps a drop to new rows: card on card, card on a row (to its end), card on the new-row gap, row on row', () => {
  expect(resolveDrop(rows, CARD('a'), CARD('c'), spanOf)).toEqual([['b'], ['a', 'c'], ['full']]);
  expect(resolveDrop(rows, CARD('c'), ROW(0), spanOf)).toEqual([['a', 'b', 'c'], ['full']]);
  expect(resolveDrop(rows, CARD('b'), NEW_ROW, spanOf)).toEqual([['a'], ['c'], ['full'], ['b']]);
  expect(resolveDrop(rows, ROW(2), ROW(0), spanOf)).toEqual([['full'], ['a', 'b'], ['c']]);
  expect(resolveDrop(rows, ROW(0), CARD('full'), spanOf)).toEqual([['c'], ['full'], ['a', 'b']]);
});

it('ignores drops that change nothing or don\'t fit', () => {
  expect(resolveDrop(rows, CARD('a'), null, spanOf)).toBe(rows);
  expect(resolveDrop(rows, CARD('full'), ROW(0), spanOf)).toEqual(rows);
});

it('the drag preview is centered on the pointer, wherever on the handle the drag started', () => {
  const t = centerOnPointer({
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    activatorEvent: new MouseEvent('pointerdown', { clientX: 100, clientY: 200 }),
    activeNodeRect: { left: 90, top: 50, width: 14, height: 300, right: 104, bottom: 350 },
    overlayNodeRect: { left: 90, top: 50, width: 60, height: 24, right: 150, bottom: 74 },
  } as unknown as Parameters<typeof centerOnPointer>[0]);
  // Pointer at (100, 200); the 60×24 preview starts at the handle's corner (90, 50).
  expect(t).toEqual({ x: 100 - 90 - 30, y: 200 - 50 - 12, scaleX: 1, scaleY: 1 });
});
