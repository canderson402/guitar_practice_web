import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from './TopBar';
import { useV2Store } from '../state/useV2Store';
import { BRAND } from '../brand';

beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><TopBar /></MemoryRouter>);

it('shows the brand name and marks the active section', () => {
  renderAt('/v2/learn');
  expect(screen.getByText(BRAND.name)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Practice' })).not.toHaveAttribute('aria-current');
});

it('cycles theme mode dark → light → system → dark', () => {
  renderAt('/v2');
  const btn = screen.getByRole('button', { name: /theme/i });
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('light');
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('system');
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('dark');
});

it('opens app settings', () => {
  renderAt('/v2');
  fireEvent.click(screen.getByRole('button', { name: 'App settings' }));
  expect(useV2Store.getState().overlay).toEqual({ kind: 'settings' });
});

it('names the reading section "Sight Reading"', () => {
  renderAt('/v2/sight-reading');
  expect(screen.getByRole('link', { name: 'Sight Reading' })).toHaveAttribute('aria-current', 'page');
});
