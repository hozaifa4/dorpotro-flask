import './safeguard';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register offline reliability Service Worker
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[DORPOTRO] ServiceWorker activated and registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('[DORPOTRO] ServiceWorker registration bypassed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
