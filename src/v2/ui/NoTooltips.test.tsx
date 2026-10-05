import React from 'react';
import { render, screen } from '@testing-library/react';
import { IconButton } from './IconButton';
import { SegmentedControl } from './SegmentedControl';
import { Fretboard } from '../../components/Fretboard';
import { PianoKeyboard } from '../../components/PianoKeyboard';

const STD = ['E', 'B', 'G', 'D', 'A', 'E'];

it('controls have no hover tooltips (screen-reader labels stay)', () => {
  render(<>
    <IconButton label="App settings" icon={<span />} />
    <SegmentedControl label="Subdivision" value="q" onChange={() => {}} options={[{ value: 'q', label: '♩', title: 'Quarter notes' }]} />
  </>);
  expect(screen.getByRole('button', { name: 'App settings' })).not.toHaveAttribute('title');
  const radio = screen.getByRole('radio', { name: 'Quarter notes' });   // symbol-only options keep a real name
  expect(radio).not.toHaveAttribute('title');
});

it('fretboard cells and piano keys have no hover tooltips', () => {
  const { unmount } = render(<Fretboard strings={6} fretCount={5} tuning={STD} dots={new Map()} onCellClick={() => {}} />);
  expect(screen.getByRole('button', { name: 'C on string 5, fret 3' })).not.toHaveAttribute('title');
  unmount();
  render(<PianoKeyboard dotFor={() => null} onKeyClick={() => {}} />);
  screen.getAllByRole('button').forEach(k => expect(k).not.toHaveAttribute('title'));
});
