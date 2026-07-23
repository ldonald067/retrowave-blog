import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/comic-neue/400.css';
import '@fontsource/comic-neue/700.css';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { initCapacitor } from './lib/capacitor';

// Set up native-only Capacitor listeners (deep links, etc.)
initCapacitor();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
