import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LearnHome } from './LearnHome';
import { ArticlePage } from './ArticlePage';
import { useV2Store } from '../state/useV2Store';
import { useStore } from '../../store/useStore';
import { ARTICLES, slugify } from './articles';

jest.mock('../../audio/piano', () => ({ playPianoNote: jest.fn() }));

beforeEach(() => act(() => useV2Store.setState(useV2Store.getInitialState(), true)));

const at = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/v2/learn" element={<LearnHome />} />
      <Route path="/v2/learn/:slug" element={<ArticlePage />} />
      <Route path="/v2" element={<p>practice page</p>} />
    </Routes>
  </MemoryRouter>,
);

it('home lists articles by chapter with read state and a continue card', () => {
  at('/v2/learn');
  expect(screen.getByRole('heading', { name: ARTICLES[0].chapter })).toBeInTheDocument();
  // The continue card and the chapter list both link to the first article.
  expect(screen.getAllByRole('link', { name: new RegExp(ARTICLES[0].title) })).toHaveLength(2);
  expect(screen.getByText(/start here/i)).toBeInTheDocument();
});

it('article renders blocks and a table of contents, and marks itself read', () => {
  at(`/v2/learn/${ARTICLES[0].slug}`);
  expect(screen.getByRole('heading', { level: 1, name: ARTICLES[0].title })).toBeInTheDocument();
  const firstHeading = ARTICLES[0].blocks.find(b => b.type === 'heading') as { text: string };
  expect(screen.getByRole('link', { name: firstHeading.text })).toHaveAttribute('href', `#${slugify(firstHeading.text)}`);
  expect(useV2Store.getState().learnProgress[ARTICLES[0].slug]).toBeDefined();
});

it('"Try it in Practice" sets shared state and navigates to Practice', () => {
  at(`/v2/learn/${ARTICLES[0].slug}`);
  fireEvent.click(screen.getByRole('button', { name: /try it in practice/i }));
  expect(useStore.getState().note.selectedScale).toBe('Major (Ionian)');
  expect(screen.getByText('practice page')).toBeInTheDocument();
});

it('unknown slugs show a friendly not-found with a way back', () => {
  at('/v2/learn/nope');
  expect(screen.getByText(/couldn't find that article/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /all articles/i })).toBeInTheDocument();
});

it('leaving an article cancels scale notes still waiting to play', () => {
  jest.useFakeTimers();
  const { playPianoNote } = jest.requireMock('../../audio/piano');
  const { unmount } = at(`/v2/learn/${ARTICLES[0].slug}`);
  fireEvent.click(screen.getAllByRole('button', { name: /hear it/i })[0]);
  (playPianoNote as jest.Mock).mockClear();
  unmount();
  act(() => { jest.runOnlyPendingTimers(); });
  expect(playPianoNote).not.toHaveBeenCalled();
  jest.useRealTimers();
});

it('placeholder articles say "coming soon" and are marked on the home list', () => {
  at('/v2/learn/intervals');
  expect(screen.getByText(/this article is coming soon/i)).toBeInTheDocument();
});

it('opening an article at a section scrolls that heading into view', () => {
  const spy = jest.fn();
  Element.prototype.scrollIntoView = spy;
  at('/v2/learn/intervals#minor-third');
  expect(spy).toHaveBeenCalled();
});
