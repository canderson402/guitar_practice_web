import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

it('is a labeled native select that reports the chosen value', () => {
  const onChange = jest.fn();
  render(<Select label="Key" value="" onChange={onChange}
    options={[{ value: '', label: 'Random' }, { value: 'G', label: 'G major' }]} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Key' }), { target: { value: 'G' } });
  expect(onChange).toHaveBeenCalledWith('G');
});
