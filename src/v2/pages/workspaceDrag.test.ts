import { dragIndices } from './workspaceDrag';

it('maps a drag from one tab onto another to store indices', () => {
  expect(dragIndices(['a', 'b', 'c'], 'a', 'c')).toEqual({ from: 0, to: 2 });
  expect(dragIndices(['a', 'b', 'c'], 'c', 'a')).toEqual({ from: 2, to: 0 });
});

it('ignores drops on nothing, on itself, or unknown ids', () => {
  expect(dragIndices(['a', 'b'], 'a', null)).toBeNull();
  expect(dragIndices(['a', 'b'], 'a', 'a')).toBeNull();
  expect(dragIndices(['a', 'b'], 'zz', 'a')).toBeNull();
});
