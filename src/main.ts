import './styles/base.css';
import { startApp } from './app/shell';
import { installErrorBoundary } from './app/error-boundary';
import { getStorage, isTauri } from './core/storage';

startApp(document.getElementById('app')!, getStorage());
installErrorBoundary();

if ('serviceWorker' in navigator && !isTauri()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}
