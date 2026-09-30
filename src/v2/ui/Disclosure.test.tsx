import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Disclosure } from './Disclosure';

it('is collapsed by default and toggles its content', () => {
  render(<Disclosure title="Auto-advance"><p>inside</p></Disclosure>);
  const header = screen.getByRole('button', { name: /Auto-advance/ });
  expect(header).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('inside')).toBeNull();
  fireEvent.click(header);
  expect(header).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('inside')).toBeInTheDocument();
});

it('can show a summary while collapsed', () => {
  render(<Disclosure title="Auto-advance" summary="Every 4 bars"><p>inside</p></Disclosure>);
  expect(screen.getByText('Every 4 bars')).toBeInTheDocument();
});
