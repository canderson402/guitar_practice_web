import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from './TopBar';
import { useV2Store } from '../state/useV2Store';
import { BRAND } from '../brand';

beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><TopBar /></MemoryRouter>);

it('shows just the two sections — Practice and Sight Reading (no Learn, no logo or app name)', () => {
  renderAt('/sight-reading');
  expect(screen.queryByText(BRAND.name)).toBeNull();
  expect(screen.getAllByRole('link').map(l => l.textContent)).toEqual(['Practice', 'Sight Reading']);
  expect(screen.getByRole('link', { name: 'Sight Reading' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Practice' })).not.toHaveAttribute('aria-current');
  expect(screen.queryByRole('link', { name: 'Learn' })).toBeNull();
});

it('cycles theme mode dark → light → system → dark', () => {
  renderAt('/');
  const btn = screen.getByRole('button', { name: /theme/i });
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('light');
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('system');
  fireEvent.click(btn); expect(useV2Store.getState().themeMode).toBe('dark');
});

it('opens app settings', () => {
  renderAt('/');
  fireEvent.click(screen.getByRole('button', { name: 'App settings' }));
  expect(useV2Store.getState().overlay).toEqual({ kind: 'settings' });
});

it('names the reading section "Sight Reading"', () => {
  renderAt('/sight-reading');
  expect(screen.getByRole('link', { name: 'Sight Reading' })).toHaveAttribute('aria-current', 'page');
});
