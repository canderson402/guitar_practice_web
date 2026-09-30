import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, SegmentedControl, Switch, Stepper, Slider, IconButton } from '.';

it('Button renders variant class and forwards clicks', () => {
  const onClick = jest.fn();
  render(<Button variant="primary" onClick={onClick}>Play</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(onClick).toHaveBeenCalled();
});

it('IconButton exposes its label to assistive tech', () => {
  render(<IconButton label="Settings" icon={<span>⚙</span>} />);
  expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
});

it('SegmentedControl is a radiogroup; arrow keys move the selection and wrap', () => {
  const onChange = jest.fn();
  render(
    <SegmentedControl label="Time" value="4" onChange={onChange}
      options={[{ value: '3', label: '3/4' }, { value: '4', label: '4/4' }, { value: '6', label: '6/8' }]} />,
  );
  const group = screen.getByRole('radiogroup', { name: 'Time' });
  expect(screen.getByRole('radio', { name: '4/4' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.keyDown(group, { key: 'ArrowRight' });
  expect(onChange).toHaveBeenLastCalledWith('6');
  fireEvent.keyDown(group, { key: 'ArrowLeft' });
  expect(onChange).toHaveBeenLastCalledWith('3');
  fireEvent.click(screen.getByRole('radio', { name: '6/8' }));
  expect(onChange).toHaveBeenLastCalledWith('6');
});

it('Switch toggles and reports state', () => {
  const onChange = jest.fn();
  render(<Switch label="Accent" checked={false} onChange={onChange} />);
  const sw = screen.getByRole('switch', { name: 'Accent' });
  expect(sw).toHaveAttribute('aria-checked', 'false');
  fireEvent.click(sw);
  expect(onChange).toHaveBeenCalledWith(true);
});

it('Stepper clamps small and big steps to its range', () => {
  const onChange = jest.fn();
  render(<Stepper label="Tempo" value={298} min={40} max={300} small={1} big={5} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Increase tempo by 5' }));
  expect(onChange).toHaveBeenLastCalledWith(300);
  fireEvent.click(screen.getByRole('button', { name: 'Decrease tempo by 1' }));
  expect(onChange).toHaveBeenLastCalledWith(297);
});

it('Stepper can hide its value slot (no empty gap between − and +)', () => {
  render(<Stepper label="Tempo" value={100} min={40} max={300} small={1} big={5} hideValue onChange={() => {}} />);
  const group = screen.getByRole('group', { name: 'Tempo' });
  expect(group.textContent).toBe('−5−1+1+5');
});

it('Slider is a labeled range input', () => {
  const onChange = jest.fn();
  render(<Slider label="Click volume" value={80} min={0} max={100} onChange={onChange} />);
  const input = screen.getByRole('slider', { name: 'Click volume' });
  fireEvent.change(input, { target: { value: '50' } });
  expect(onChange).toHaveBeenCalledWith(50);
});

it('Stepper value can be clicked and typed into (Enter commits, clamped; Escape cancels)', () => {
  const onChange = jest.fn();
  render(<Stepper label="Tempo" value={96} min={40} max={300} small={1} big={5} editable onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tempo: 96, click to type' }));
  const input = screen.getByRole('spinbutton', { name: 'Tempo' });
  fireEvent.change(input, { target: { value: '132' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(onChange).toHaveBeenLastCalledWith(132);
  fireEvent.click(screen.getByRole('button', { name: 'Tempo: 96, click to type' }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Tempo' }), { target: { value: '999' } });
  fireEvent.blur(screen.getByRole('spinbutton', { name: 'Tempo' }));
  expect(onChange).toHaveBeenLastCalledWith(300);
  onChange.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Tempo: 96, click to type' }));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Tempo' }), { target: { value: '50' } });
  fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'Tempo' }), { key: 'Escape' });
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByRole('spinbutton')).toBeNull();
});
