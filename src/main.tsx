import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppV2 from './AppV2';
import PwaInstallPrompt from './PwaInstallPrompt';
import './styles.css';
import './phase2.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppV2 />
    <PwaInstallPrompt />
  </StrictMode>,
);
