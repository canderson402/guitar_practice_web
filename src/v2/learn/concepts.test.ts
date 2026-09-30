import { CONCEPTS, getConcept } from './concepts';
import { getArticle, slugify } from './articles';

it('every concept points at an existing article section', () => {
  const broken = Object.entries(CONCEPTS).filter(([, c]) => {
    const article = getArticle(c.slug);
    if (!article) return true;
    const headings = article.blocks.filter(b => b.type === 'heading').map(b => slugify((b as { text: string }).text));
    return !!c.section && !headings.includes(c.section);
  }).map(([id]) => id);
  expect(broken).toEqual([]);
});

it('looks up concepts by id', () => {
  expect(getConcept('tempo')?.label).toBe('tempo');
  expect(getConcept('nope')).toBeUndefined();
});
