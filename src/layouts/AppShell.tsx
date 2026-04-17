import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Select, Button, ToggleButtonGroup } from '../ui';
import { useStore, configurationPresets } from '../store/useStore';
import { themes } from '../utils/themeGenerator';

const SECTIONS = [
  { value: '/', label: 'Practice' },
  { value: '/sight-reading', label: 'Sight Reading' },
];

const AppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    theme,
    setTheme,
    applyConfiguration,
    currentConfiguration,
    viewMode,
    setViewMode,
  } = useStore();

  const section = SECTIONS.find(s => s.value === location.pathname)?.value ?? '/';
  const isPractice = section === '/';

  return (
    <div className={`app theme-${theme}`}>
      <header className="app-header">
        <h1>Guitar Practice</h1>
        <p className="contact-info">
          Questions, bug reports, or feature requests? Contact me at{' '}
          <a href="mailto:canderson1192@gmail.com">canderson1192@gmail.com</a>
        </p>
        <div className="header-controls">
          <div className="header-selector">
            <label>Section:</label>
            <Select
              size="sm"
              value={section}
              onChange={(e) => navigate(e.target.value)}
              options={SECTIONS.map(s => ({ value: s.value, label: s.label }))}
            />
          </div>
          {isPractice && (
            <div className="header-selector">
              <label>Configuration:</label>
              <Select
                size="sm"
                value={currentConfiguration}
                onChange={(e) => applyConfiguration(e.target.value)}
                options={configurationPresets.map(p => ({ value: p.id, label: p.name }))}
              />
            </div>
          )}
          <div className="header-selector">
            <label>Theme:</label>
            <Select
              size="sm"
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              options={Object.entries(themes).map(([id, data]) => ({ value: id, label: data.name }))}
            />
          </div>
          {isPractice && (
            <div className="header-selector">
              <label>View:</label>
              <ToggleButtonGroup label="View mode" layout="segmented">
                <Button
                  variant="ghost"
                  size="sm"
                  active={viewMode === 'fretboard'}
                  onClick={() => setViewMode('fretboard')}
                >
                  Fretboard
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  active={viewMode === 'piano'}
                  onClick={() => setViewMode('piano')}
                >
                  Piano
                </Button>
              </ToggleButtonGroup>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
