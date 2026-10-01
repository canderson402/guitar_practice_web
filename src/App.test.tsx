import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Smoke tests: the app mounts at its routes without crashing.
jest.mock('./audio/piano', () => ({ playPianoNote: jest.fn(), preloadPiano: jest.fn() }));
jest.mock('./audio/guitar', () => ({ playGuitarNote: jest.fn(), preloadGuitar: jest.fn() }));
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

it('the app (formerly v2) is at the root', () => {
  at('/sight-reading');
  expect(screen.getByRole('link', { name: 'Practice' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('heading', { level: 1, name: 'Sight Reading' })).toBeInTheDocument();
});

it('old /v2 links redirect to the same page at the root', () => {
  at('/v2/sight-reading');
  expect(screen.getByRole('heading', { level: 1, name: 'Sight Reading' })).toBeInTheDocument();
});
