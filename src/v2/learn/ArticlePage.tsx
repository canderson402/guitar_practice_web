import React, { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import s from './Learn.module.css';
import { ARTICLES, getArticle, slugify } from './articles';
import { BlockRenderer } from './blocks/BlockRenderer';
import { useV2Store } from '../state/useV2Store';

export const ArticlePage: React.FC = () => {
  const { slug = '' } = useParams();
  const article = getArticle(slug);
  const markRead = useV2Store(st => st.markRead);
  const { hash } = useLocation();
  // Placeholder articles don't count as read.
  useEffect(() => { if (article && !article.draft) markRead(article.slug); }, [article, markRead]);
  // Learn links open "article#section": bring that heading into view.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash, article]);

  if (!article) {
    return (
      <main className={s.article}>
        <p>We couldn't find that article.</p>
        <Link to="/v2/learn">All articles</Link>
      </main>
    );
  }
  const idx = ARTICLES.indexOf(article);
  const prev = ARTICLES[idx - 1];
  const next = ARTICLES[idx + 1];
  const headings = article.blocks.filter((b): b is { type: 'heading'; text: string } => b.type === 'heading');
  return (
    <div className={s.articleWrap}>
      <main className={s.article}>
        <Link to="/v2/learn" className={s.back}>← All articles</Link>
        <span className={s.eyebrow}>{article.chapter} · {article.minutes} min</span>
        <h1 className={s.title}>{article.title}</h1>
        <p className={s.lede}>{article.summary}</p>
        {article.draft && <p className={s.draft}>This article is coming soon. The sections below are placeholders.</p>}
        {article.blocks.map((b, i) => <BlockRenderer key={i} block={b} />)}
        <nav className={s.pager} aria-label="Article navigation">
          {prev ? <Link to={`/v2/learn/${prev.slug}`}>← {prev.title}</Link> : <span />}
          {next && <Link to={`/v2/learn/${next.slug}`}>{next.title} →</Link>}
        </nav>
      </main>
      {headings.length > 0 && (
        <aside className={s.toc} aria-label="On this page">
          <span className={s.eyebrow}>On this page</span>
          {headings.map(h => <a key={h.text} href={`#${slugify(h.text)}`}>{h.text}</a>)}
        </aside>
      )}
    </div>
  );
};
