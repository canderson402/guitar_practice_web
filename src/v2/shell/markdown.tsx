import React from 'react';

// A small markdown renderer for the About page — just what prose needs:
//   # Title   ## Section   ### Sub-section
//   paragraphs (lines join until a blank line)
//   - or * bullets, indented bullets nest under the one above
//   **bold**  *italic*  `code`  [link](https://…)
// It builds React elements, so text is always text: no HTML is injected.

type Item = { text: string; children: Item[] };

const SAFE_URL = /^(https?:|mailto:)/i;
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/;

const inline = (text: string): React.ReactNode[] =>
  text.split(INLINE).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return SAFE_URL.test(link[2])
        ? <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>
        : link[1];
    }
    return part;
  });

const list = (items: Item[], key: React.Key): React.ReactNode => (
  <ul key={key}>
    {items.map((it, i) => <li key={i}>{inline(it.text)}{it.children.length > 0 && list(it.children, 'sub')}</li>)}
  </ul>
);

export const renderMarkdown = (src: string): React.ReactNode => {
  const out: React.ReactNode[] = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(<p key={out.length}>{inline(para.join(' '))}</p>);
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flushPara(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      const Tag = (['h2', 'h3', 'h4'] as const)[heading[1].length - 1];
      out.push(<Tag key={out.length}>{inline(heading[2].trim())}</Tag>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      // Consecutive bullet lines; deeper indents nest under the item above.
      const root: Item[] = [];
      const stack: Array<{ indent: number; items: Item[] }> = [{ indent: -1, items: root }];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)[-*]\s+(.*)$/)!;
        const indent = m[1].replace(/\t/g, '  ').length;
        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
        const parent = stack[stack.length - 1];
        const item: Item = { text: m[2].trim(), children: [] };
        parent.items.push(item);
        stack.push({ indent, items: item.children });
        i++;
      }
      i--;
      out.push(list(root, out.length));
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  return out;
};
