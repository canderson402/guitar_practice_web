import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { useV2Store } from '../state/useV2Store';

jest.mock('./playback', () => ({ playInterval: jest.fn(), stopEarNotes: jest.fn(), preloadEarInstruments: jest.fn() }));
// The board draws a fretboard/piano; record what it was asked to show.
jest.mock('./IntervalBoard', () => ({
  IntervalBoard: (p: object) => { (globalThis as Record<string, unknown>).mockBoard = p; return <div>board</div>; },
}));
// eslint-disable-next-line import/first
import { EarTrainingPage } from './EarTrainingPage';
// eslint-disable-next-line import/first
import { playInterval, stopEarNotes } from './playback';
// eslint-disable-next-line import/first
import { INTERVALS } from './intervalQuiz';

const played = playInterval as jest.Mock;
const lastCall = () => played.mock.calls[played.mock.calls.length - 1];
const lastQuestion = () => lastCall()[1] as { semitones: number; low: number; direction: string };
const nameOf = (semi: number) => INTERVALS.find(i => i.semitones === semi)!.name;
const answers = () => within(screen.getByRole('group', { name: 'Answers' }));
const renderPage = () => {
  const view = render(<EarTrainingPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Ear training settings' }));
  return view;
};
const board = () => (globalThis as unknown as Record<string, { instrument: string; notes: number[] | null; secondLit: boolean; labels: string }>).mockBoard;
const start = () => fireEvent.click(screen.getByRole('button', { name: 'Start' }));

beforeEach(() => {
  act(() => useV2Store.setState({ cardPrefs: {} }));
  played.mockClear();
  (stopEarNotes as jest.Mock).mockClear();
});

it('keeps the controls in a side panel, closed at first, with a short summary on the page', () => {
  render(<EarTrainingPage />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByRole('radio', { name: 'Guitar' })).toBeNull();
  expect(screen.getByText('Guitar · Up · 7 intervals')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ear training settings' }));
  const panel = within(screen.getByRole('dialog', { name: 'Ear training settings' }));
  expect(panel.getByRole('radio', { name: 'Guitar' })).toBeInTheDocument();
  expect(panel.getByRole('group', { name: 'Intervals' })).toBeInTheDocument();
});

it('keys typed in the side panel work the panel, not the quiz', () => {
  renderPage();
  start();
  const piano = screen.getByRole('radio', { name: 'Piano' });
  fireEvent.keyDown(piano, { key: ' ' });
  fireEvent.keyDown(piano, { key: '1' });
  expect(played).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status')).toHaveTextContent('');
});

it('has only the simple controls: instrument, direction, fixed root and intervals', () => {
  renderPage();
  expect(screen.getByRole('heading', { level: 1, name: 'Ear Training' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Guitar' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'Piano' })).toBeInTheDocument();
  for (const d of ['Up', 'Down', 'Both', 'Together']) expect(screen.getByRole('radio', { name: d })).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Fixed root' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Intervals' })).toBeInTheDocument();
  for (const gone of ['Fast', 'Slow']) expect(screen.queryByRole('radio', { name: gone })).toBeNull();
  expect(screen.queryByRole('switch', { name: 'Auto advance' })).toBeNull();
  expect(screen.queryByRole('group', { name: 'Questions' })).toBeNull();
});

it('saves the instrument choice', () => {
  renderPage();
  fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
  expect(useV2Store.getState().cardPrefs['ear-training']?.instrument).toBe('piano');
});

it('presets and chips choose the intervals', () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Simple' }));
  const picker = within(screen.getByRole('group', { name: 'Intervals' }));
  expect(picker.getByRole('button', { name: 'Major 3rd' })).toHaveAttribute('aria-pressed', 'true');
  expect(picker.getByRole('button', { name: 'Minor 3rd' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(picker.getByRole('button', { name: 'Minor 3rd' }));
  expect(picker.getByRole('button', { name: 'Minor 3rd' })).toHaveAttribute('aria-pressed', 'true');
});

it('each interval has a Listen button that plays it from middle C, before or during the quiz', () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Listen to Tritone' }));
  expect(lastCall()[0]).toBe('guitar');
  expect(lastQuestion()).toEqual({ low: 60, semitones: 6, direction: 'ascending' });
  fireEvent.click(screen.getByRole('radio', { name: 'Down' }));
  fireEvent.click(screen.getByRole('button', { name: 'Listen to Octave' }));
  expect(lastQuestion()).toEqual({ low: 48, semitones: 12, direction: 'descending' });
  // Listening does not start the quiz.
  expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
});

it('Start plays an interval and shows the selected answers only', () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'Simple' }));
  start();
  expect(played).toHaveBeenCalledTimes(1);
  expect(lastCall()[0]).toBe('guitar');
  expect([4, 7, 12]).toContain(lastQuestion().semitones);
  expect(answers().getAllByRole('button')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: /Hear again/ }));
  expect(played).toHaveBeenCalledTimes(2);
});

it('a right answer flashes green, a CORRECT! rises from that button, then a new interval at once', () => {
  jest.useFakeTimers();
  renderPage();
  start();
  const q = lastQuestion();
  const button = answers().getByRole('button', { name: nameOf(q.semitones) });
  fireEvent.click(button);
  expect(button).toHaveClass('right');
  expect(within(button).getByText('CORRECT!')).toBeInTheDocument();
  expect(screen.getByText('1/1')).toBeInTheDocument();
  expect(played).toHaveBeenCalledTimes(1);
  // Another press during the flash does nothing.
  fireEvent.click(button);
  expect(screen.getByText('1/1')).toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(400); });
  expect(played).toHaveBeenCalledTimes(2);
  expect(lastQuestion()).not.toEqual(q);
  expect(answers().getByRole('button', { name: nameOf(q.semitones) })).not.toHaveClass('right');
  // No "Correct" left over on the new question.
  expect(screen.getByRole('status')).toHaveTextContent('');
  fireEvent.animationEnd(screen.getByText('CORRECT!'));
  expect(screen.queryByText('CORRECT!')).toBeNull();
  jest.useRealTimers();
});

it('a wrong answer does not give away the right one: try again, only the first guess scores', () => {
  renderPage();
  start();
  const q = lastQuestion();
  const wrongs = INTERVALS.filter(i => i.semitones !== q.semitones && [2, 4, 5, 7, 9, 11, 12].includes(i.semitones));
  fireEvent.click(answers().getByRole('button', { name: wrongs[0].name }));
  expect(screen.getByRole('status')).toHaveTextContent(`Not a ${wrongs[0].name} — try again`);
  expect(screen.getByRole('status')).not.toHaveTextContent(nameOf(q.semitones));
  expect(answers().getByRole('button', { name: wrongs[0].name })).toHaveClass('wrong');
  expect(answers().getByRole('button', { name: nameOf(q.semitones) })).not.toHaveClass('right');
  // The question plays again.
  expect(played).toHaveBeenCalledTimes(2);
  expect(lastQuestion()).toEqual(q);
  expect(screen.getByText('0/1')).toBeInTheDocument();
  fireEvent.click(answers().getByRole('button', { name: wrongs[1].name }));
  expect(screen.getByText('0/1')).toBeInTheDocument();
  fireEvent.click(answers().getByRole('button', { name: nameOf(q.semitones) }));
  expect(answers().getByRole('button', { name: nameOf(q.semitones) })).toHaveClass('right');
  expect(screen.getByText('0/1')).toBeInTheDocument();
});

it('Next cuts the notes and plays a new interval at once', () => {
  renderPage();
  start();
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  expect(played).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status')).toHaveTextContent('');
});

it('changing an option during the quiz plays a new interval with it at once', () => {
  renderPage();
  start();
  fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
  expect(played).toHaveBeenCalledTimes(2);
  expect(lastCall()[0]).toBe('piano');
  fireEvent.click(screen.getByRole('radio', { name: 'Together' }));
  expect(played).toHaveBeenCalledTimes(3);
  expect(lastQuestion().direction).toBe('harmonic');
  fireEvent.click(screen.getByRole('button', { name: 'Simple' }));
  expect(played).toHaveBeenCalledTimes(4);
  expect([4, 7, 12]).toContain(lastQuestion().semitones);
});

it('Reset clears the score and plays a new interval', () => {
  renderPage();
  start();
  fireEvent.click(answers().getByRole('button', { name: nameOf(lastQuestion().semitones) }));
  expect(screen.getByText('1/1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.getByText('0/0')).toBeInTheDocument();
  expect(played).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('button', { name: 'End Quiz' })).toBeNull();
});

it('keyboard: number keys answer, A hears again, Space goes to the next interval', () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: 'All' }));
  start();
  fireEvent.keyDown(document.body, { key: 'a' });
  expect(played).toHaveBeenCalledTimes(2);
  const semi = lastQuestion().semitones;
  fireEvent.keyDown(document.body, { key: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='][semi - 1] });
  expect(screen.getByText('CORRECT!')).toBeInTheDocument();
  fireEvent.keyDown(document.body, { key: ' ' });
  expect(played).toHaveBeenCalledTimes(3);
});

it('Space does not start the metronome on this page', () => {
  const onWindow = jest.fn();
  window.addEventListener('keydown', onWindow);
  renderPage();
  fireEvent.keyDown(document.body, { key: ' ' });
  expect(onWindow).not.toHaveBeenCalled();
  window.removeEventListener('keydown', onWindow);
});

it('leaving the page cuts the notes', () => {
  const { unmount } = renderPage();
  start();
  (stopEarNotes as jest.Mock).mockClear();
  unmount();
  expect(stopEarNotes).toHaveBeenCalled();
});

describe('the fretboard / piano under the practice card', () => {
  it('shows the guitar or piano to match the instrument', () => {
    renderPage();
    expect(screen.getByRole('region', { name: 'Notes' })).toHaveTextContent('board');
    expect(board().instrument).toBe('guitar');
    fireEvent.click(screen.getByRole('radio', { name: 'Piano' }));
    expect(board().instrument).toBe('piano');
  });

  it('shows each question\'s notes as they play', () => {
    renderPage();
    start();
    expect(board().notes).not.toBeNull();
    const first = board().notes;
    fireEvent.click(screen.getByRole('button', { name: /Hear again/ }));
    expect(board().notes).toEqual(first);
  });

  it('Listen shows the notes as they sound: the second one a beat later', () => {
    jest.useFakeTimers();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Listen to Perfect 5th' }));
    expect(board().notes).toEqual([60, 67]);
    expect(board().secondLit).toBe(false);
    act(() => { jest.advanceTimersByTime(1100); });
    expect(board().secondLit).toBe(true);
    jest.useRealTimers();
  });

  it('Listen with Together lights both notes at once', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: 'Together' }));
    fireEvent.click(screen.getByRole('button', { name: 'Listen to Perfect 5th' }));
    expect(board().secondLit).toBe(true);
  });

  it('the side panel chooses the labels: notes, intervals or dots (saved)', () => {
    renderPage();
    expect(board().labels).toBe('notes');
    fireEvent.click(screen.getByRole('radio', { name: 'Intervals' }));
    expect(board().labels).toBe('intervals');
    fireEvent.click(screen.getByRole('radio', { name: 'Dots' }));
    expect(board().labels).toBe('dots');
    expect(useV2Store.getState().cardPrefs['ear-training']?.boardLabels).toBe('dots');
  });

  it('"Show the board" off hides it for audio-only practice (saved)', () => {
    renderPage();
    const toggle = screen.getByRole('switch', { name: 'Show the board' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(screen.queryByRole('region', { name: 'Notes' })).not.toBeInTheDocument();
    expect(useV2Store.getState().cardPrefs['ear-training']?.showBoard).toBe(false);
    fireEvent.click(toggle);
    expect(screen.getByRole('region', { name: 'Notes' })).toBeInTheDocument();
  });

});

it('a wrong answer does not go on', () => {
  jest.useFakeTimers();
  renderPage();
  start();
  const q = lastQuestion();
  const wrong = INTERVALS.find(i => i.semitones !== q.semitones && [2, 4, 5, 7, 9, 11, 12].includes(i.semitones))!;
  fireEvent.click(answers().getByRole('button', { name: wrong.name }));
  act(() => { jest.advanceTimersByTime(10000); });
  expect(played).toHaveBeenCalledTimes(2);
  expect(lastQuestion()).toEqual(q);
  jest.useRealTimers();
});
