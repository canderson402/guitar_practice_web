import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { renderMarkdown } from './markdown';

const md = (src: string) => render(<div data-testid="out">{renderMarkdown(src)}</div>);

it('headings: # is the title, ## a section, ### a sub-section', () => {
  md('# Hello\n\n## Cards\n\n### Metronome');
  expect(screen.getByRole('heading', { level: 2, name: 'Hello' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 3, name: 'Cards' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 4, name: 'Metronome' })).toBeInTheDocument();
});

it('paragraphs: lines join until a blank line', () => {
  md('One line\nsame paragraph.\n\nNext one.');
  expect(screen.getByText('One line same paragraph.').tagName).toBe('P');
  expect(screen.getByText('Next one.').tagName).toBe('P');
});

it('lists with - or *, and indented sub-bullets nested under their item', () => {
  md('- Metronome\n  - Tap tempo\n  - Subdivisions\n* Scale');
  const [top, sub] = screen.getAllByRole('list');
  expect(within(sub).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Tap tempo', 'Subdivisions']);
  // The top list has two items; the sub-list sits inside the first.
  const topItems = within(top).getAllByRole('listitem').filter(li => !within(sub).queryAllByRole('listitem').includes(li));
  expect(topItems.map(li => li.textContent)).toEqual(['MetronomeTap tempoSubdivisions', 'Scale']);
});

it('inline: **bold**, *italic*, `code` and [links](url) (opening in a new tab)', () => {
  md('Try **bold**, *soft*, `A4 = 440` and [the site](https://example.com).');
  expect(screen.getByText('bold').tagName).toBe('STRONG');
  expect(screen.getByText('soft').tagName).toBe('EM');
  expect(screen.getByText('A4 = 440').tagName).toBe('CODE');
  const link = screen.getByRole('link', { name: 'the site' });
  expect(link).toHaveAttribute('href', 'https://example.com');
  expect(link).toHaveAttribute('target', '_blank');
});

it('treats anything else as plain text (no HTML is ever injected)', () => {
  md('<img src=x onerror=alert(1)> and <b>tags</b>');
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.getByTestId('out')).toHaveTextContent('<img src=x onerror=alert(1)> and <b>tags</b>');
});

it('only http(s) and mailto links become links', () => {
  md('[bad](javascript:alert(1)) [mail](mailto:a@b.c)');
  expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
  expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute('href', 'mailto:a@b.c');
});
