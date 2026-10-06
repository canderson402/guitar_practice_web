import React, { useEffect, useState } from 'react';
import { renderMarkdown } from './markdown';

// The About text lives in public/about.md — plain markdown (see markdown.tsx
// for what's supported). It's fetched when the modal opens, so editing it
// only needs a page refresh.
const ABOUT_URL = `${process.env.PUBLIC_URL ?? ''}/about.md`;

export const AboutContent: React.FC = () => {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(ABOUT_URL, { cache: 'no-cache' })
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then(t => { if (live) setText(t); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  if (failed) return <p>Couldn't load the About page — try again in a moment.</p>;
  return text === null ? null : <>{renderMarkdown(text)}</>;
};
