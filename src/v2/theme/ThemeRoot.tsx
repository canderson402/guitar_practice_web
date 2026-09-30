import React, { useEffect } from 'react';
import { THEMES, tokensToCss, ThemeName } from '../styles/tokens';
import { useResolvedTheme } from './useResolvedTheme';
import '../styles/base.css';
import '../styles/legacyBridge.css';

const STYLE_ID = 'gp2-tokens';

const ensureTokenStyle = () => {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = tokensToCss();
  document.head.appendChild(el);
};

/** The v2 root: token CSS, data-theme, and the page background. v1's global
 *  body styles are overridden while mounted and restored on unmount. */
export const ThemeRoot: React.FC<{ mode: ThemeName | 'system'; children: React.ReactNode }> = ({
  mode, children,
}) => {
  const theme = useResolvedTheme(mode);
  ensureTokenStyle();

  useEffect(() => {
    const prev = { background: document.body.style.background, color: document.body.style.color };
    document.body.style.background = THEMES[theme].bg;
    document.body.style.color = THEMES[theme].text;
    return () => {
      document.body.style.background = prev.background;
      document.body.style.color = prev.color;
    };
  }, [theme]);

  return <div className="gp2" data-theme={theme} data-testid="gp2-root">{children}</div>;
};
