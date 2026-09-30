import React, { useRef } from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { Popover, SideSheet, Dialog, Toast, Tabs, Picker } from '.';

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  }));
});

const PopoverHarness: React.FC<{ onClose(): void }> = ({ onClose }) => {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={ref}>anchor</button>
      <button>outside</button>
      <Popover open anchorRef={ref} onClose={onClose} title="Tempo"><button>inside</button></Popover>
    </>
  );
};

it('Popover closes on Escape and outside pointerdown, not inside', () => {
  const onClose = jest.fn();
  render(<PopoverHarness onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: 'Tempo' })).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByText('inside'));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByText('outside'));
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(2);
});

it('Popover does not close when the anchor itself is pressed (the anchor toggles it)', () => {
  const onClose = jest.fn();
  render(<PopoverHarness onClose={onClose} />);
  fireEvent.pointerDown(screen.getByText('anchor'));
  expect(onClose).not.toHaveBeenCalled();
});

it('SideSheet traps focus and closes on Escape', () => {
  const onClose = jest.fn();
  render(<SideSheet open onClose={onClose} title="Metronome"><button>a</button><button>b</button></SideSheet>);
  const sheet = screen.getByRole('dialog', { name: 'Metronome' });
  const buttons = within(sheet).getAllByRole('button'); // [close, a, b]
  act(() => buttons[buttons.length - 1].focus());
  fireEvent.keyDown(sheet, { key: 'Tab' });
  expect(buttons[0]).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

it('Dialog renders nothing when closed', () => {
  render(<Dialog open={false} onClose={() => {}} title="Add card">x</Dialog>);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('Toast runs its action and auto-dismisses', () => {
  jest.useFakeTimers();
  const onAction = jest.fn(); const onDismiss = jest.fn();
  render(<Toast message="Card removed" actionLabel="Undo" onAction={onAction} onDismiss={onDismiss} timeoutMs={5000} />);
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(onAction).toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(5000); });
  expect(onDismiss).toHaveBeenCalled();
  jest.useRealTimers();
});

it('Tabs is a tablist with arrow-key navigation', () => {
  const onSelect = jest.fn();
  render(<Tabs label="Workspaces" activeId="a" onSelect={onSelect}
    items={[{ id: 'a', label: 'Warm-up' }, { id: 'b', label: 'Theory' }]} />);
  fireEvent.keyDown(screen.getByRole('tablist', { name: 'Workspaces' }), { key: 'ArrowRight' });
  expect(onSelect).toHaveBeenCalledWith('b');
  expect(screen.getByRole('tab', { name: 'Warm-up' })).toHaveAttribute('aria-selected', 'true');
});

it('Picker selects an option', () => {
  const onChange = jest.fn();
  render(<Picker label="Key" value="C" onChange={onChange} options={[{ value: 'C', label: 'C' }, { value: 'G', label: 'G' }]} />);
  fireEvent.click(screen.getByRole('radio', { name: 'G' }));
  expect(onChange).toHaveBeenCalledWith('G');
});

it('one Escape closes only the top-most layer (dialog over a side sheet)', () => {
  const closeSheet = jest.fn(); const closeDialog = jest.fn();
  render(<>
    <SideSheet open onClose={closeSheet} title="Metronome"><button>a</button></SideSheet>
    <Dialog open onClose={closeDialog} title="Add card"><button>b</button></Dialog>
  </>);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(closeDialog).toHaveBeenCalledTimes(1);
  expect(closeSheet).not.toHaveBeenCalled();
});

it('SideSheet can open on the left', () => {
  render(<SideSheet open side="left" onClose={() => {}} title="Metronome">x</SideSheet>);
  expect(screen.getByRole('dialog', { name: 'Metronome' })).toHaveAttribute('data-side', 'left');
});

it('SideSheet closes on a tap outside it, but not inside or on a sheet trigger', () => {
  const onClose = jest.fn();
  render(<>
    <button>outside</button>
    <button data-sheet-trigger>gear</button>
    <SideSheet open onClose={onClose} title="Metronome"><button>inside</button></SideSheet>
  </>);
  fireEvent.pointerDown(screen.getByText('inside'));
  fireEvent.pointerDown(screen.getByText('gear'));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByText('outside'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
