import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import V2App from './v2/V2App';

/** Old /v2/... links (from before v2 became the app) go to the same page at the root. */
const FromV2: React.FC = () => {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`${pathname.replace(/^\/v2/, '') || '/'}${search}${hash}`} replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/v2/*" element={<FromV2 />} />
      <Route path="/*" element={<V2App />} />
    </Routes>
  );
}

export default App;
