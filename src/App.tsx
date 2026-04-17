import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import './themes.css';
import './styles/design-system.css';
import AppShell from './layouts/AppShell';
import PracticePage from './pages/PracticePage';
import SightReadingPage from './pages/SightReadingPage';
import { DesignSystemPreview } from './ui/DesignSystemPreview';
import { useStore } from './store/useStore';
import { injectThemeStyles } from './utils/themeGenerator';

function App() {
  const theme = useStore(s => s.theme);

  React.useEffect(() => {
    injectThemeStyles();
  }, []);

  React.useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  return (
    <Routes>
      <Route path="/design" element={<DesignSystemPreview />} />
      <Route element={<AppShell />}>
        <Route index element={<PracticePage />} />
        <Route path="/sight-reading" element={<SightReadingPage />} />
      </Route>
    </Routes>
  );
}

export default App;
