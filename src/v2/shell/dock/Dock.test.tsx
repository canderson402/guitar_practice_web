import React from 'react';
import { render as rtlRender, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dock } from './Dock';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';


// Pop-ups are rendered inside a router like the app.
const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});
beforeEach(() => act(() => {
  useV2Store.setState(useV2Store.getInitialState(), true);
  useStore.getState().setSelectedNote('A');
  useStore.getState().setSelectedScale('Aeolian (Natural Minor)');
}));
afterEach(() => act(() => useStore.getState().setMetronomePlaying(false)));

it('shows key, BPM and play; play toggles the shared transport state', () => {
  render(<Dock />);
  expect(screen.getByRole('button', { name: /A Aeolian/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(useStore.getState().metronome.isPlaying).toBe(true);
  expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
});

it('key pop-up sets key and major/minor in the shared store', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /A Aeolian/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'E' }));
  expect(useStore.getState().note.selectedNote).toBe('E');
  // Full scale list in context — no separate Major/Minor switch.
  expect(screen.queryByRole('radiogroup', { name: 'Scale type' })).toBeNull();
  fireEvent.click(screen.getByRole('radio', { name: 'Ionian (Major)' }));
  expect(useStore.getState().note.selectedScale).toBe('Major (Ionian)');
  fireEvent.click(screen.getByRole('radio', { name: 'Dorian' }));
  expect(useStore.getState().note.selectedScale).toBe('Dorian');
  fireEvent.click(screen.getByRole('radio', { name: 'Chromatic' }));
  expect(useStore.getState().note.selectedScale).toBe('Chromatic');
});

it('only one pop-up is open at a time', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /A Aeolian/ }));
  fireEvent.click(screen.getByRole('button', { name: /BPM/ }));
  expect(screen.queryByRole('dialog', { name: 'Key' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Tempo' })).toBeInTheDocument();
});

it('the meter & volume pop-up has an accessible trigger (visible on every width)', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /meter & volume/i }));
  expect(screen.getByRole('dialog', { name: 'Meter & volume' })).toBeInTheDocument();
});

it('opening a pop-up moves focus into it; Escape returns focus to its trigger', () => {
  render(<Dock />);
  const chip = screen.getByRole('button', { name: /A Aeolian/ });
  expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
  fireEvent.click(chip);
  // First control in the key pop-up (the C key) receives focus.
  expect(screen.getByRole('radio', { name: 'C' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(chip).toHaveFocus();
});

it('dock summary shows the time signature (6/8, not 6/4)', () => {
  act(() => { useStore.getState().setBeatsPerMeasure(6); useStore.getState().setBeatUnit(8); });
  render(<Dock />);
  expect(screen.getByRole('button', { name: /meter & volume/i })).toHaveTextContent('6/8');
  act(() => { useStore.getState().setBeatsPerMeasure(4); useStore.getState().setBeatUnit(4); });
});

it('the tempo and meter pop-ups have no ? (concepts) button', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /BPM/ }));
  expect(screen.queryByRole('button', { name: /^Concepts in/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /meter & volume/i }));
  expect(screen.queryByRole('button', { name: /^Concepts in/ })).toBeNull();
});

it('groups scales: Modes (in mode order), then Other below; Ionian labeled with (Major)', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /A Aeolian/ }));
  const modes = within(screen.getByRole('radiogroup', { name: 'Modes' }))
    .getAllByRole('radio').map(r => r.textContent);
  expect(modes).toEqual(['Ionian (Major)', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian (Natural Minor)', 'Locrian']);
  const others = within(screen.getByRole('radiogroup', { name: 'Other' })).getAllByRole('radio').map(r => r.textContent);
  expect(others).toEqual(expect.arrayContaining(['Chromatic', 'Major Pentatonic', 'Minor Pentatonic', 'Harmonic Minor']));
  expect(others).not.toContain('Dorian');
});

it('the key chip shows key and mode as two fixed-width parts, so changing either never shifts the dock', () => {
  render(<Dock />);
  const chip = screen.getByRole('button', { name: /A Aeolian/ });
  const key = within(chip).getByTestId('dock-key');
  const mode = within(chip).getByTestId('dock-mode');
  expect(key).toHaveTextContent(/^A$/);
  expect(mode).toHaveTextContent(/^Aeolian$/);
  // CSS modules map to plain class names under Jest; those classes set fixed widths.
  expect(key).toHaveClass('keyPart');
  expect(mode).toHaveClass('modePart');
});

it('the meter pop-up has just one volume — Master (click and pad live on their cards)', () => {
  render(<Dock />);
  fireEvent.click(screen.getByRole('button', { name: /Meter & volume/ }));
  const pop = screen.getByRole('dialog', { name: 'Meter & volume' });
  expect(within(pop).getAllByRole('slider').map(el => el.getAttribute('aria-label'))).toEqual(['Master volume']);
});

it('beat dots switch instantly with no scale or fade (nothing to shimmer between beats)', () => {
  const css = require('fs').readFileSync(require('path').join(__dirname, 'BeatDots.module.css'), 'utf8') as string;
  expect(css).not.toMatch(/transition|transform|scale\(/);
});
