import { packRows, moveInRow, moveToRow, moveRowBy, rowsFromFlat, splitOverfullRows, dropCard, moveRow } from './rows';

const cards = (spec: Array<[string, number]>) => spec.map(([id, colSpan]) => ({ id, colSpan }));

describe('packRows', () => {
  it('fills rows left to right in order until the next card does not fit', () => {
    expect(packRows(cards([['m', 3], ['t', 3], ['s', 3], ['f', 12]]), 12)).toEqual([['m', 't', 's'], ['f']]);
  });
});

const rows = [['m', 't', 's'], ['f']];

it('moves a card left/right within its row (no-op at the ends)', () => {
  expect(moveInRow(rows, 0, 1, -1)).toEqual([['t', 'm', 's'], ['f']]);
  expect(moveInRow(rows, 0, 2, 1)).toEqual(rows);
});

it('moves a card to the row above/below, creating a new row at the top or bottom, and drops empty rows', () => {
  expect(moveToRow(rows, 0, 2, 1)).toEqual([['m', 't'], ['f', 's']]);
  expect(moveToRow(rows, 1, 0, -1)).toEqual([['m', 't', 's', 'f']]);
  expect(moveToRow(rows, 0, 0, -1)).toEqual([['m'], ['t', 's'], ['f']]);
  expect(moveToRow(rows, 1, 0, 1)).toEqual([['m', 't', 's'], ['f']]); // alone in the last row: stays
});

it('moves whole rows up/down', () => {
  expect(moveRowBy(rows, 1, -1)).toEqual([['f'], ['m', 't', 's']]);
  expect(moveRowBy(rows, 0, -1)).toEqual(rows);
});

it('converts an old flat card list into rows, giving full-width cards their own row', () => {
  expect(rowsFromFlat(['metronome', 'timer', 'scale', 'fretboard'], ['fretboard', 'harmony']))
    .toEqual([['metronome', 'timer', 'scale'], ['fretboard']]);
  expect(rowsFromFlat(['scale', 'harmony', 'fretboard'], ['fretboard', 'harmony']))
    .toEqual([['scale'], ['harmony'], ['fretboard']]);
});

describe('splitOverfullRows', () => {
  const span: Record<string, number> = { a: 3, b: 3, c: 3, d: 3, e: 3, full: 12, half: 6 };
  const spanOf = (id: string) => span[id];
  it('leaves rows that fit alone', () => {
    expect(splitOverfullRows([['a', 'b', 'c'], ['full']], spanOf)).toEqual([['a', 'b', 'c'], ['full']]);
  });
  it('moves what doesn\'t fit into a new row right after, keeping order', () => {
    expect(splitOverfullRows([['a', 'b', 'c', 'd', 'e'], ['full']], spanOf)).toEqual([['a', 'b', 'c', 'd'], ['e'], ['full']]);
    expect(splitOverfullRows([['a', 'half', 'b', 'c']], spanOf)).toEqual([['a', 'half', 'b'], ['c']]);
  });
  it('so a full-width card is always alone in its row', () => {
    expect(splitOverfullRows([['a', 'b', 'full', 'c']], spanOf)).toEqual([['a', 'b'], ['full'], ['c']]);
    expect(splitOverfullRows([['full', 'full']], spanOf)).toEqual([['full'], ['full']]);
  });
  it('unknown cards take no room and stay put', () => {
    expect(splitOverfullRows([['a', 'x', 'b', 'c', 'd']], spanOf)).toEqual([['a', 'x', 'b', 'c', 'd']]);
  });
});

const SPAN: Record<string, number> = { a: 3, b: 3, c: 3, d: 3, e: 3, f: 3, full: 12, jam: 12 };
const spanOf = (id: string) => SPAN[id];

describe('moveToRow with room', () => {
  it('joins the row above/below when the card fits', () => {
    expect(moveToRow([['a', 'b'], ['c', 'd']], 1, 0, -1, spanOf)).toEqual([['a', 'b', 'c'], ['d']]);
    expect(moveToRow([['a', 'b'], ['c', 'd']], 0, 1, 1, spanOf)).toEqual([['a'], ['c', 'd', 'b']]);
  });
  it('gets its own row in between when it doesn\'t fit', () => {
    expect(moveToRow([['a', 'b', 'c', 'd'], ['e', 'f']], 1, 0, -1, spanOf)).toEqual([['a', 'b', 'c', 'd'], ['e'], ['f']]);
    expect(moveToRow([['full'], ['a', 'b']], 1, 1, -1, spanOf)).toEqual([['full'], ['b'], ['a']]);
  });
  it('a card alone in its row that doesn\'t fit just swaps rows', () => {
    expect(moveToRow([['a', 'b'], ['full']], 1, 0, -1, spanOf)).toEqual([['full'], ['a', 'b']]);
    expect(moveToRow([['full'], ['jam']], 0, 0, 1, spanOf)).toEqual([['jam'], ['full']]);
  });
});

describe('dropCard (dragging)', () => {
  it('reorders within a row', () => {
    expect(dropCard([['a', 'b', 'c']], 'a', { kind: 'card', row: 0, index: 2 }, spanOf)).toEqual([['b', 'c', 'a']]);
  });
  it('moves to another row before the card it was dropped on, when there\'s room', () => {
    expect(dropCard([['a', 'b'], ['c']], 'a', { kind: 'card', row: 1, index: 0 }, spanOf)).toEqual([['b'], ['a', 'c']]);
    expect(dropCard([['a'], ['c']], 'a', { kind: 'card', row: 1, index: 0 }, spanOf)).toEqual([['a', 'c']]); // emptied row goes
  });
  it('when the row is full, the two cards trade places (if both rows still fit)', () => {
    expect(dropCard([['a'], ['b', 'c', 'd', 'e']], 'a', { kind: 'card', row: 1, index: 1 }, spanOf)).toEqual([['c'], ['b', 'a', 'd', 'e']]);
    expect(dropCard([['full'], ['a', 'b']], 'full', { kind: 'card', row: 1, index: 0 }, spanOf)).toEqual([['full'], ['a', 'b']]); // full can't fit next to b: no change
  });
  it('can start a new row', () => {
    expect(dropCard([['a', 'b'], ['c']], 'b', { kind: 'newRow', at: 1 }, spanOf)).toEqual([['a'], ['b'], ['c']]);
    expect(dropCard([['a', 'b']], 'a', { kind: 'newRow', at: 1 }, spanOf)).toEqual([['b'], ['a']]);
  });
});

it('moveRow drags a row to a new position', () => {
  expect(moveRow([['a'], ['b'], ['c']], 0, 2)).toEqual([['b'], ['c'], ['a']]);
});
