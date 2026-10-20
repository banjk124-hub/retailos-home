import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/login.css';
import './styles/home.css';
import './styles/motion.css';
import './styles/responsive.css';
import './styles/theme.css';
import './styles/interactions.css';
import './styles/mobile-tuning.css';
import './styles/login-refresh.css';
import './styles/performance.css';
import './styles/home-ux.css';
import './styles/adaptive-appearance.css';
import './styles/home-engine.css';
import './styles/home-redesign.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Không thể đăng ký Service Worker:', error);
    });
  });
}
