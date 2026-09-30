import { lazy, Suspense, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppV2 from './AppV2';
import PwaInstallPrompt from './PwaInstallPrompt';
import './design-tokens.css';
import './styles.css';
import './components.css';
import './sports-components.css';
import './phase2.css';
import './league-view.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('No se pudo registrar el service worker', error);
    });
  });
}

const DesignPreview = import.meta.env.DEV && window.location.pathname === '/design'
  ? lazy(() => import('./design/DesignPreview')) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {DesignPreview ? <Suspense fallback={<p className="loader">Cargando referencia…</p>}><DesignPreview /></Suspense> : <><AppV2 /><PwaInstallPrompt /></>}
  </StrictMode>,
);
