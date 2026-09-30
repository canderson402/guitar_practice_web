import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimeSignatureInput } from './TimeSignatureInput';
import { useStore } from '../../store/useStore';

const m = () => useStore.getState().metronome;
beforeEach(() => act(() => { useStore.getState().setBeatsPerMeasure(4); useStore.getState().setBeatUnit(4); }));

const type = (name: string, value: string) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}:`) }));
  const input = screen.getByRole('spinbutton', { name });
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

it('lets you type the top and bottom numbers', () => {
  render(<TimeSignatureInput />);
  type('Beats per bar', '7');
  type('Beat unit', '8');
  expect(m().beatsPerMeasure).toBe(7);
  expect(m().beatUnit).toBe(8);
});

it('clamps the top number and ignores a bottom number that is not a note value', () => {
  render(<TimeSignatureInput />);
  type('Beats per bar', '40');
  expect(m().beatsPerMeasure).toBe(16);
  type('Beat unit', '5');
  expect(m().beatUnit).toBe(4);
});

it('offers common signatures as shortcuts', () => {
  render(<TimeSignatureInput />);
  fireEvent.click(screen.getByRole('radio', { name: '6/8' }));
  expect([m().beatsPerMeasure, m().beatUnit]).toEqual([6, 8]);
});
