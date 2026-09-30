import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConceptsMenu } from './ConceptsMenu';

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});

it('one ? opens the list of concepts, each linking to its Learn section', () => {
  render(<MemoryRouter><ConceptsMenu title="Metronome" concepts={['tempo', 'time-signature', 'subdivision']} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Concepts in Metronome' }));
  const list = screen.getByRole('dialog', { name: 'Concepts in Metronome' });
  expect(list).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Tempo' })).toHaveAttribute('href', '/v2/learn/rhythm-basics#tempo');
  expect(screen.getByRole('link', { name: 'Time signatures' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Subdivisions' })).toBeInTheDocument();
});

it('renders nothing when a card has no concepts', () => {
  const { container } = render(<MemoryRouter><ConceptsMenu title="Timer" concepts={[]} /></MemoryRouter>);
  expect(container).toBeEmptyDOMElement();
});
