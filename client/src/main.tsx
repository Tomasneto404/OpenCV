import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ToastProvider } from './components/Toast';
import { I18nProvider } from './i18n';
import { KonamiEgg } from './components/KonamiEgg';
import { installCaptureGuard } from './utils/captureGuard';
import { installAnalytics } from './utils/analytics';

installCaptureGuard();
installAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ToastProvider>
        <App />
        <KonamiEgg />
      </ToastProvider>
    </I18nProvider>
  </StrictMode>,
);
