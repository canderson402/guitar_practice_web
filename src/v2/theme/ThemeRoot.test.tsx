import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeRoot } from './ThemeRoot';

const mockMatchMedia = (dark: boolean) => {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: dark, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  }));
};

it('applies the explicit theme and restores body styles on unmount', () => {
  mockMatchMedia(false);
  document.body.style.background = 'red';
  const { unmount } = render(<ThemeRoot mode="dark"><p>hi</p></ThemeRoot>);
  expect(screen.getByTestId('gp2-root')).toHaveAttribute('data-theme', 'dark');
  // The token <style> is injected into <head>, outside the render tree.
  // eslint-disable-next-line testing-library/no-node-access
  expect(document.getElementById('gp2-tokens')).not.toBeNull();
  unmount();
  expect(document.body.style.background).toBe('red');
});

it('resolves system mode from prefers-color-scheme', () => {
  mockMatchMedia(true);
  render(<ThemeRoot mode="system"><p>sys</p></ThemeRoot>);
  expect(screen.getByTestId('gp2-root')).toHaveAttribute('data-theme', 'dark');
});

it('re-reads the OS theme when switching to system after the OS changed', () => {
  mockMatchMedia(false);
  const { rerender } = render(<ThemeRoot mode="light"><p>x</p></ThemeRoot>);
  mockMatchMedia(true); // OS switched to dark while the app was in light mode
  rerender(<ThemeRoot mode="system"><p>x</p></ThemeRoot>);
  expect(screen.getByTestId('gp2-root')).toHaveAttribute('data-theme', 'dark');
});
