import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/responsive.css';
import './styles/theme.css';
import './styles/interactions.css';
import './styles/mobile-tuning.css';
import './styles/performance.css';
import './styles/adaptive-appearance.css';
import './styles/native-experience.css';
import './shared/brand/brand.css';
import './shared/motion/motion.css';
import './shared/components/glass/glass.tokens.css';
import './shared/components/glass/glass.materials.css';
import './shared/navigation/LiquidDock.css';
import { MotionBoundary, MotionProvider } from './shared/motion';
import { AppErrorBoundary } from './shared/components/AppErrorBoundary';
import PwaUpdatePrompt from './shared/pwa/PwaUpdatePrompt';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
    <MotionProvider>
      <MotionBoundary>
        <App />
        <PwaUpdatePrompt />
      </MotionBoundary>
    </MotionProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);

