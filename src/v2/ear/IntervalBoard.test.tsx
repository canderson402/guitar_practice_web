/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntervalBoard } from './IntervalBoard';

it('piano: lights the two keys, first and second in different colors', () => {
  render(<IntervalBoard instrument="piano" notes={[60, 67]} secondLit />);
  expect(screen.getByRole('button', { name: 'C4' })).toHaveClass('variant-root');
  expect(screen.getByRole('button', { name: 'G4' })).toHaveClass('variant-current');
});

it('piano: the second key waits until it sounds', () => {
  render(<IntervalBoard instrument="piano" notes={[60, 67]} secondLit={false} />);
  expect(screen.getByRole('button', { name: 'C4' })).toHaveClass('variant-root');
  expect(screen.getByRole('button', { name: 'G4' })).not.toHaveClass('variant-current');
});

it('guitar: shows a fretboard with the two notes', () => {
  const { container } = render(<IntervalBoard instrument="guitar" notes={[45, 52]} secondLit />);
  expect(screen.getByTestId('fretboard')).toBeInTheDocument();
  expect(container.querySelectorAll('.variant-root, .has-variant-root')).toHaveLength(1);
  expect(container.querySelectorAll('.variant-current, .has-variant-current')).toHaveLength(1);
});

it('with no notes, the board is empty', () => {
  const { container } = render(<IntervalBoard instrument="guitar" notes={null} secondLit={false} />);
  expect(container.querySelectorAll('[class*="variant-"]')).toHaveLength(0);
});

describe('labels', () => {
  const keyText = (name: string) => screen.getByRole('button', { name }).textContent;

  it('piano: note names, intervals, or plain dots', () => {
    const { rerender } = render(<IntervalBoard instrument="piano" notes={[60, 67]} secondLit labels="notes" />);
    expect(keyText('C4')).toBe('C');
    expect(keyText('G4')).toBe('G');
    rerender(<IntervalBoard instrument="piano" notes={[60, 67]} secondLit labels="intervals" />);
    expect(keyText('C4')).toBe('R');
    expect(keyText('G4')).toBe('P5');
    rerender(<IntervalBoard instrument="piano" notes={[60, 67]} secondLit labels="dots" />);
    expect(keyText('C4')).toBe('');
    expect(keyText('G4')).toBe('');
  });

  it('descending: the first note is R; the second is labeled as its interval from R (E down to D# = M7)', () => {
    const { rerender } = render(<IntervalBoard instrument="piano" notes={[76, 75]} secondLit labels="intervals" />);
    expect(keyText('E5')).toBe('R');
    expect(keyText('D#5')).toBe('M7');
    rerender(<IntervalBoard instrument="piano" notes={[76, 65]} secondLit labels="intervals" />);
    expect(keyText('F4')).toBe('m2');
    rerender(<IntervalBoard instrument="piano" notes={[76, 64]} secondLit labels="intervals" />);
    expect(keyText('E4')).toBe('U');
  });

  it('guitar: intervals and dots', () => {
    const { container, rerender } = render(<IntervalBoard instrument="guitar" notes={[45, 52]} secondLit labels="intervals" />);
    const labels = () => Array.from(container.querySelectorAll('.has-variant-root, .has-variant-current, .variant-root, .variant-current')).map(e => e.textContent);
    expect(labels().sort()).toEqual(['P5', 'R']);
    rerender(<IntervalBoard instrument="guitar" notes={[45, 52]} secondLit labels="dots" />);
    expect(labels()).toEqual(['', '']);
  });
});
