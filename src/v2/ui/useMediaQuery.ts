import { useEffect, useState } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const get = () => (typeof window.matchMedia === 'function' && window.matchMedia(query)?.matches) || false;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    if (!mql) return;
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
};
