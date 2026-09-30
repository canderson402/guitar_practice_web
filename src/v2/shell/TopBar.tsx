import React from 'react';
import { NavLink } from 'react-router-dom';
import { Moon, Sun, Monitor, Settings } from 'lucide-react';
import s from './TopBar.module.css';
import { BRAND } from '../brand';
import { LogoMark, IconButton } from '../ui';
import { useV2Store, ThemeMode } from '../state/useV2Store';

const NEXT: Record<ThemeMode, ThemeMode> = { dark: 'light', light: 'system', system: 'dark' };
const ICON: Record<ThemeMode, React.ReactNode> = { dark: <Moon size={16} />, light: <Sun size={16} />, system: <Monitor size={16} /> };

export const TopBar: React.FC = () => {
  const themeMode = useV2Store(st => st.themeMode);
  const setThemeMode = useV2Store(st => st.setThemeMode);
  const setOverlay = useV2Store(st => st.setOverlay);
  const link = ({ isActive }: { isActive: boolean }) => [s.link, isActive ? s.on : ''].join(' ');
  return (
    <header className={s.bar}>
      <NavLink to="/v2" end className={s.brand}><LogoMark /><span className={s.name}>{BRAND.name}</span></NavLink>
      <nav className={s.nav} aria-label="Sections">
        <NavLink to="/v2" end className={link}>Practice</NavLink>
        <NavLink to="/v2/learn" className={link}>Learn</NavLink>
        <NavLink to="/v2/sight-reading" className={link}>Sight Reading</NavLink>
      </nav>
      <div className={s.right}>
        <IconButton label={`Theme: ${themeMode}`} icon={ICON[themeMode]} onClick={() => setThemeMode(NEXT[themeMode])} />
        <IconButton label="App settings" icon={<Settings size={16} />} data-sheet-trigger onClick={() => setOverlay({ kind: 'settings' })} />
      </div>
    </header>
  );
};
