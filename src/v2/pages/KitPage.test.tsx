import React from 'react';
import { render, screen } from '@testing-library/react';
import { KitPage } from './KitPage';

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});

it('renders a section for every kit component', () => {
  render(<KitPage />);
  ['Buttons', 'Icon buttons', 'Chips', 'Segmented control', 'Switch', 'Stepper', 'Slider', 'Picker', 'Tabs', 'Overlays']
    .forEach(name => expect(screen.getByRole('heading', { name })).toBeInTheDocument());
});
