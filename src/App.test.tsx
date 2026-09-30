import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Smoke tests: both apps mount at their routes without crashing.
jest.mock('./audio/piano', () => ({ playPianoNote: jest.fn(), preloadPiano: jest.fn() }));
// jsdom has no Web Audio; the shell applies master volume on mount.
jest.mock('./audio/engine', () => {
  const ctx: any = { currentTime: 0, resume: jest.fn(), state: 'running' };
  const node = () => ({ context: ctx, connect: jest.fn(), disconnect: jest.fn(), gain: { value: 1, setTargetAtTime: jest.fn() } });
  ctx.createGain = node;
  return {
    getAudioContext: () => ctx, getMasterGain: node, getReverbSend: node,
    setMasterVolume: jest.fn(), resumeAudio: jest.fn(), disposeAudio: jest.fn(),
  };
});

const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

beforeAll(() => {
  window.matchMedia = window.matchMedia ?? (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })) as any;
});

it('renders the v2 Learn page (lazy chunk loads inside the router)', async () => {
  at('/v2/learn');
  expect(await screen.findByRole('heading', { level: 1, name: 'Learn' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Practice' })).toBeInTheDocument();
});

it('renders the v1 app at /', () => {
  at('/');
  expect(screen.getAllByText(/guitar practice/i).length).toBeGreaterThan(0);
});
