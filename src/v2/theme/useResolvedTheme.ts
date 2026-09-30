import { useEffect, useState } from 'react';
import type { ThemeName } from '../styles/tokens';

const query = '(prefers-color-scheme: dark)';

export const useResolvedTheme = (mode: ThemeName | 'system'): ThemeName => {
  const [systemDark, setSystemDark] = useState(
    () => (typeof window.matchMedia === 'function' && window.matchMedia(query)?.matches) || false,
  );
  useEffect(() => {
    if (mode !== 'system' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    if (!mql) return;
    setSystemDark(mql.matches);   // resync: the OS may have changed while mode wasn't 'system'
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);
  if (mode === 'system') return systemDark ? 'dark' : 'light';
  return mode;
};
