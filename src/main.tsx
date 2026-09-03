import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Force clear stale caches across updates
const BUILD_VERSION = '2026-09-04_v3';
try {
  const current = localStorage.getItem('dizi_crm_build_version');
  if (current !== BUILD_VERSION) {
    localStorage.setItem('dizi_crm_build_version', BUILD_VERSION);
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
  }
} catch (e) {
  console.warn('Storage check warning:', e);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
