import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { AboutModal } from './AboutModal';
import { useV2Store } from '../state/useV2Store';

beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));
// The text comes from public/about.md.
beforeEach(() => { (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('# About me\n\nHi.') }); });

it('shows nothing until opened', () => {
  render(<AboutModal />);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('opens as a dialog with the about text and the contact email (with Copy)', async () => {
  act(() => useV2Store.getState().setOverlay({ kind: 'about' }));
  render(<AboutModal />);
  const dialog = screen.getByRole('dialog', { name: 'About' });
  expect(await within(dialog).findByRole('heading', { level: 2, name: 'About me' })).toBeInTheDocument();
  expect(within(dialog).getByText('canderson1192@gmail.com')).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: /copy email/i })).toBeInTheDocument();
  // Floating notes are decoration only.
  expect(within(dialog).getAllByTestId('about-note').every(n => n.getAttribute('aria-hidden') === 'true')).toBe(true);
});

it('closes with the close button or Escape, after a short closing animation', () => {
  jest.useFakeTimers();
  act(() => useV2Store.getState().setOverlay({ kind: 'about' }));
  render(<AboutModal />);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'closing');
  act(() => { jest.advanceTimersByTime(400); });
  expect(useV2Store.getState().overlay).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  act(() => useV2Store.getState().setOverlay({ kind: 'about' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  act(() => { jest.advanceTimersByTime(400); });
  expect(useV2Store.getState().overlay).toBeNull();
  jest.useRealTimers();
});

it('springs in with floating notes, and just fades for people who prefer reduced motion', () => {
  const css = fs.readFileSync(path.join(__dirname, 'AboutModal.module.css'), 'utf8');
  expect(css).toMatch(/@keyframes about-pluck/);
  expect(css).toMatch(/@keyframes about-note/);
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.note[^}]*display: none/);
});
