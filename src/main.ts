import './styles/base.css';
import { startApp } from './app/shell';
import { installErrorBoundary } from './app/error-boundary';
import { getStorage } from './core/storage';

startApp(document.getElementById('app')!, getStorage());
installErrorBoundary();
