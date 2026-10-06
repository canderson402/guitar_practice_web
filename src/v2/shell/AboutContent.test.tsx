import React from 'react';
import { render, screen } from '@testing-library/react';
import { AboutContent } from './AboutContent';

afterEach(() => { (global as any).fetch = undefined; });

it('loads about.md from the site and renders it as markdown', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('# Hello Fellow Learner\n\nSome **words**.') });
  (global as any).fetch = fetchMock;
  render(<AboutContent />);
  expect(await screen.findByRole('heading', { level: 2, name: 'Hello Fellow Learner' })).toBeInTheDocument();
  expect(screen.getByText('words').tagName).toBe('STRONG');
  expect(fetchMock.mock.calls[0][0]).toMatch(/about\.md$/);
});

it('says so if the page can\'t be loaded', async () => {
  (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('') });
  render(<AboutContent />);
  expect(await screen.findByText(/couldn.t load/i)).toBeInTheDocument();
});
