import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MetronomeFace } from './metronome/MetronomeFace';
import { ScaleFace } from './scale/ScaleFace';
import { TimerFace } from './timer/TimerFace';
import { useStore } from '../../store/useStore';
import { useV2Store } from '../state/useV2Store';

// The small cards share one layout (top line, hero value, caption, controls)
// so their big values and controls line up across a row of cards.
const slots = (el: HTMLElement) =>
  // eslint-disable-next-line testing-library/no-node-access
  Array.from(el.querySelectorAll('[data-slot]')).map(n => n.getAttribute('data-slot'));

beforeEach(() => act(() => {
  const st = useStore.getState();
  st.setBpm(120); st.setSelectedNote('C'); st.setSelectedScale('Major (Ionian)'); st.setCurrentNoteIndex(0);
  st.setTimerMode('countUp'); st.setElapsedSeconds(0);
  useV2Store.getState().setNoteSelected(true);   // the Scale card shows its value once a note is selected
}));

it.each([
  ['Metronome', () => <MetronomeFace />, '120'],
  ['Scale', () => <ScaleFace />, 'C'],
  ['Timer', () => <TimerFace />, '00:00'],
])('%s uses the shared hero layout', (_name, Face, hero) => {
  const { container } = render(<MemoryRouter>{Face()}</MemoryRouter>);
  expect(slots(container)).toEqual(['top', 'hero', 'caption', 'controls']);
  expect(screen.getByTestId('hero-value')).toHaveTextContent(hero);
});
