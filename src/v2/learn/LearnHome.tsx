import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import s from './Learn.module.css';
import { ARTICLES } from './articles';
import { useV2Store } from '../state/useV2Store';

export const LearnHome: React.FC = () => {
  const progress = useV2Store(st => st.learnProgress);
  const readable = ARTICLES.filter(a => !a.draft);
  const next = readable.find(a => !progress[a.slug]) ?? readable[0] ?? ARTICLES[0];
  const started = ARTICLES.some(a => progress[a.slug]);
  const chapters = Array.from(new Set(ARTICLES.map(a => a.chapter)));
  return (
    <main className={s.home}>
      <h1 className={s.title}>Learn</h1>
      <Link to={`/v2/learn/${next.slug}`} className={s.continue}>
        <span className={s.eyebrow}>{started ? 'Continue where you left off' : 'Start here'}</span>
        <span className={s.continueTitle}>{next.title}</span>
        <span className={s.muted}>{next.summary}</span>
      </Link>
      {chapters.map(ch => (
        <section key={ch} className={s.chapter}>
          <h2 className={s.chapterTitle}>{ch}</h2>
          <ol className={s.list}>
            {ARTICLES.filter(a => a.chapter === ch).map(a => (
              <li key={a.slug}>
                <Link to={`/v2/learn/${a.slug}`} className={s.item}>
                  {progress[a.slug] ? <CheckCircle2 size={16} className={s.done} aria-label="Read" /> : <Circle size={16} className={s.muted} aria-label="Unread" />}
                  <span className={s.itemTitle}>{a.title}</span>
                  {a.draft && <span className={s.soon}>Coming soon</span>}
                  <span className={s.muted}>{a.minutes} min</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
};
