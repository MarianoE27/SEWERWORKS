import './polyfills';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './lib/i18n';
import App from './App.tsx';
import { AuthProvider } from './components/auth/AuthContext';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { registerAllProjections } from './lib/projections';

registerAllProjections();

const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver')) {
    return;
  }
  originalError.call(console, ...args);
};

window.addEventListener('error', (e) => {
  if (e.message === 'ResizeObserver loop limit exceeded') {
    e.stopImmediatePropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
