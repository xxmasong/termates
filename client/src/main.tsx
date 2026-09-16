import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import '@/styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Only registered for the built app — in dev the SW would serve stale modules
// and fight Vite's HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
