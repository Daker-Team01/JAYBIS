import React from 'react';
import { createRoot } from 'react-dom/client';

window.React = React;
window.ReactDOM = { createRoot };

async function bootstrap() {
  await import('../tweaks-panel.jsx');
  await import('./data.jsx');
  await import('./ui.jsx');
  await import('./onboarding.jsx');
  await import('./dashboard.jsx');
  await import('./budget.jsx');
  await import('./products.jsx');
  await import('./chat.jsx');
  await import('./profile.jsx');
  await import('./main.jsx');
  await import('./tweaks.jsx');
}

bootstrap();
