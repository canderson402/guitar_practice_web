import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';

const Boom = () => { throw new Error('Loading chunk 21 failed'); };

it('shows a reload prompt instead of a blank page when v2 fails to load', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<ChunkErrorBoundary><Boom /></ChunkErrorBoundary>);
  expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
});
