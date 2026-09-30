import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeRoot } from './theme/ThemeRoot';
import { useV2Store } from './state/useV2Store';
import { V2Layout } from './shell/V2Layout';
import { Dock } from './shell/dock/Dock';
import { CardSheetHost } from './cards/CardSheetHost';
import { PracticePage } from './pages/PracticePage';
import { KitPage } from './pages/KitPage';
import { SightReadingPage } from './sight/SightReadingPage';
import { LearnHome } from './learn/LearnHome';
import { ArticlePage } from './learn/ArticlePage';

const V2App: React.FC = () => {
  const themeMode = useV2Store(s => s.themeMode);
  return (
    <ThemeRoot mode={themeMode}>
      <Routes>
        <Route path="kit" element={<KitPage />} />
        <Route element={<V2Layout dock={<Dock />} sheetHost={<CardSheetHost />} />}>
          <Route index element={<PracticePage />} />
          <Route path="learn" element={<LearnHome />} />
          <Route path="learn/:slug" element={<ArticlePage />} />
          <Route path="sight-reading" element={<SightReadingPage />} />
          <Route path="read" element={<Navigate to="/v2/sight-reading" replace />} />
          <Route path="*" element={<Navigate to="/v2" replace />} />
        </Route>
      </Routes>
    </ThemeRoot>
  );
};

export default V2App;
