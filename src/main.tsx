import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/home.css';
import './styles/responsive.css';
import './styles/theme.css';
import './styles/interactions.css';
import './styles/mobile-tuning.css';
import './styles/performance.css';
import './styles/home-ux.css';
import './styles/adaptive-appearance.css';
import './styles/home-engine.css';
import './styles/home-redesign.css';
import './styles/home-architecture.css';
import './styles/scanner-qa-monitor.css';
import './styles/native-experience.css';
import './shared/brand/brand.css';
import './shared/motion/motion.css';
import './shared/components/glass/glass.tokens.css';
import './shared/components/glass/glass.materials.css';
import './shared/navigation/LiquidDock.css';
import './styles/login-experience.css';
import './features/stocktake/components/stocktake.css';
import { MotionBoundary, MotionProvider } from './shared/motion';
import { AppErrorBoundary } from './shared/components/AppErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
    <MotionProvider>
      <MotionBoundary>
        <App />
      </MotionBoundary>
    </MotionProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Không thể đăng ký Service Worker:', error);
    });
  });
}
