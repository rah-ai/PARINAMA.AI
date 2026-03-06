/* ════════════════════════════════════════════════
   PARINAMA — main.jsx
   React entry point with ThemeProvider wrapper
   ════════════════════════════════════════════════ */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';

/* ── Mount ───────────────────────────────────── */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
