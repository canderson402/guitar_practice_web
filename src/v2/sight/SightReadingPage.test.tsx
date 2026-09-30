import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useStore } from '../../store/useStore';
import { midiToPitch } from '../../data/pitch';

jest.mock('../../audio/piano', () => ({ playPianoNote: jest.fn(), preloadPiano: jest.fn() }));
jest.mock('../../audio/guitar', () => ({ playGuitarNote: jest.fn(), preloadGuitar: jest.fn() }));
jest.mock('../../audio', () => ({ resumeAudio: jest.fn(), getAudioContext: () => ({ currentTime: 0 }) }));
// Staff/fretboard renderers draw with VexFlow/SVG; stub them to keep this a page test.
// Stubs record their last props on a global (CRA resets jest.fn mocks between tests).
jest.mock('../../components/NoteReading/StaffPrompt', () => ({
  StaffPrompt: (p: object) => { (globalThis as Record<string, unknown>).mockStaffProps = p; return <div>staff prompt</div>; },
}));
jest.mock('../../components/NoteReading/PhrasePrompt', () => ({
  PhrasePrompt: (p: object) => { (globalThis as Record<string, unknown>).mockPhraseProps = p; return <div>phrase prompt</div>; },
}));
jest.mock('../../components/NoteReading/FretboardPrompt', () => ({ FretboardPrompt: () => <div>fretboard prompt</div> }));
// eslint-disable-next-line import/first
import { SightReadingPage } from './SightReadingPage';

const nr = () => useStore.getState().noteReading;

beforeEach(() => act(() => {
  useStore.getState().setNoteReadingMode('staff');
  useStore.getState().resetNoteReadingScore();
}));

it('is titled Sight Reading and shows the staff prompt with the answer piano', () => {
  render(<SightReadingPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Sight Reading' })).toBeInTheDocument();
  expect(screen.getByText('staff prompt')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'C4' })).toBeInTheDocument(); // answer piano key
});

it('switches modes through the shared store', () => {
  render(<SightReadingPage />);
  fireEvent.click(screen.getByRole('radio', { name: 'Fretboard' }));
  expect(nr().mode).toBe('fretboard');
  expect(screen.getByText('fretboard prompt')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'C#' })).toBeInTheDocument(); // note-name grid
  fireEvent.click(screen.getByRole('radio', { name: '24 frets' }));
  expect(nr().fretCount).toBe(24);
  fireEvent.click(screen.getByRole('radio', { name: 'Arpeggio' }));
  expect(nr().mode).toBe('phrase');
  expect(screen.getByRole('combobox', { name: 'Key' })).toBeInTheDocument();
});

it('never lets both clefs be turned off', () => {
  render(<SightReadingPage />);
  const treble = screen.getByRole('button', { name: 'Treble' });
  const bass = screen.getByRole('button', { name: 'Bass' });
  if (bass.getAttribute('aria-pressed') === 'true') fireEvent.click(bass);
  fireEvent.click(treble);
  expect(nr().trebleEnabled || nr().bassEnabled).toBe(true);
});

it('answering updates the score chips, and Reset clears them', () => {
  render(<SightReadingPage />);
  fireEvent.click(screen.getByRole('radio', { name: 'Fretboard' }));
  const correct = nr().prompt!.kind === 'fretboard' ? (nr().prompt as any).acceptableAnswers[0] : 'C';
  fireEvent.click(screen.getByRole('button', { name: correct }));
  expect(screen.getByText('1/1')).toBeInTheDocument();
  expect(screen.getByText('Correct')).toBeInTheDocument();
  expect(screen.getByText('Streak')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reset score' }));
  expect(screen.getByText('0/0')).toBeInTheDocument();
});

it('tells you what to do, and gives live right/wrong feedback', () => {
  render(<SightReadingPage />);
  expect(screen.getByText('Name this note')).toBeInTheDocument();
  const midi = (nr().prompt as { midi: number }).midi;
  const wrong = midi === 91 ? midi - 1 : midi + 1;
  const name = (m: number) => { const p = midiToPitch(m); return `${p.name}${p.octave}`; };
  fireEvent.click(screen.getByRole('button', { name: name(wrong) }));
  expect(screen.getByRole('status')).toHaveTextContent(`Not ${name(wrong)} — try again`);
  fireEvent.click(screen.getByRole('button', { name: name(midi) }));
  expect(screen.getByRole('status')).toHaveTextContent('Correct!');
});

it('the prompt, feedback and answer live together in one practice card', () => {
  render(<SightReadingPage />);
  const card = screen.getByRole('region', { name: 'Practice' });
  expect(card).toContainElement(screen.getByText('staff prompt'));
  expect(card).toContainElement(screen.getByRole('button', { name: 'C4' }));
});

it('marks middle C once, below the keys, pointing up at it', () => {
  render(<SightReadingPage />);
  expect(screen.queryByTestId('middle-c-notch')).toBeNull();
  const marker = screen.getByTestId('middle-c-marker');
  expect(marker).toHaveTextContent('▲Middle C');
  // eslint-disable-next-line no-bitwise
  expect(screen.getByRole('button', { name: 'C4' }).compareDocumentPosition(marker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('every mode shows its prompt in the same fixed-size area, with instruction and feedback on one line', () => {
  render(<SightReadingPage />);
  const stage = () => screen.getByTestId('prompt-stage');
  expect(stage()).toHaveClass('promptStage');
  expect(stage()).toContainElement(screen.getByText('staff prompt'));
  fireEvent.click(screen.getByRole('radio', { name: 'Fretboard' }));
  expect(stage()).toHaveClass('promptStage');
  expect(stage()).toContainElement(screen.getByText('fretboard prompt'));
  fireEvent.click(screen.getByRole('radio', { name: 'Arpeggio' }));
  expect(stage()).toHaveClass('promptStage');
  expect(stage()).toContainElement(screen.getByText('phrase prompt'));
  expect(screen.getByTestId('prompt-line')).toContainElement(screen.getByRole('status'));
});

it('the score sits on the practice card\'s top line, either side of the instruction', () => {
  render(<SightReadingPage />);
  const line = screen.getByTestId('prompt-line');
  expect(line).toContainElement(screen.getByText('Correct'));
  expect(line).toContainElement(screen.getByText('Streak'));
  expect(line).toContainElement(screen.getByRole('button', { name: 'Reset score' }));
  expect(line).toContainElement(screen.getByText('Name this note'));
});

it('staff and arpeggio notation are drawn at the same scale', () => {
  const last = (k: string) => (globalThis as unknown as Record<string, { scale?: number }>)[k];
  render(<SightReadingPage />);
  const staffScale = last('mockStaffProps').scale;
  expect(staffScale).toEqual(expect.any(Number));
  fireEvent.click(screen.getByRole('radio', { name: 'Arpeggio' }));
  expect(last('mockPhraseProps').scale).toBe(staffScale);
});
