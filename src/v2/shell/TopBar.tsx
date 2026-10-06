import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';
import s from './TopBar.module.css';
import { IconButton } from '../ui';
import { useV2Store } from '../state/useV2Store';

export const TopBar: React.FC = () => {
  const setOverlay = useV2Store(st => st.setOverlay);
  const link = ({ isActive }: { isActive: boolean }) => [s.link, isActive ? s.on : ''].join(' ');
  return (
    <header className={s.bar}>
      <nav className={s.nav} aria-label="Sections">
        <NavLink to="/" end className={link}>Practice</NavLink>
        <NavLink to="/sight-reading" className={link}>Sight Reading</NavLink>
      </nav>
      <div className={s.right}>
        <button type="button" className={s.about} onClick={() => setOverlay({ kind: 'about' })}>About</button>
        <IconButton label="App settings" icon={<Settings size={16} />} data-sheet-trigger onClick={() => setOverlay({ kind: 'settings' })} />
      </div>
    </header>
  );
};
