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

const V2App: React.FC = () => {
  const themeMode = useV2Store(s => s.themeMode);
  return (
    <ThemeRoot mode={themeMode}>
      <Routes>
        <Route path="kit" element={<KitPage />} />
        <Route element={<V2Layout dock={<Dock />} sheetHost={<CardSheetHost />} />}>
          <Route index element={<PracticePage />} />
          <Route path="sight-reading" element={<SightReadingPage />} />
          <Route path="read" element={<Navigate to="/sight-reading" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ThemeRoot>
  );
};

export default V2App;
