// packages/dockview-solid-example/src/index.tsx
import './index.css';
import { render } from 'solid-js/web';
import { ThemeProvider, createTheme } from '@suid/material/styles';

import App from './App';
import LandingPage from './landing/LandingPage';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6c5ce7',
    },
    secondary: {
      main: '#e87b35',
    },
    background: {
      default: '#0d0f1a',
      paper: '#12141f',
    },
    text: {
      primary: '#c8ccd8',
      secondary: '#7a7f96',
    },
    divider: '#2a2d44',
    action: {
      hover: 'rgba(108, 92, 231, 0.12)',
      selected: 'rgba(108, 92, 231, 0.2)',
    },
  },
});

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

function normalizeBasePath(baseUrl: string): string {
  const normalized = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  return normalizePath(normalized);
}

function isPlaygroundRoute(pathname: string): boolean {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL ?? '/');
  const playgroundPath = normalizePath(`${basePath}/DataMorph-Playground`.replace(/\/{2,}/g, '/'));
  const normalized = normalizePath(pathname);
  return normalized === playgroundPath || normalized.startsWith(`${playgroundPath}/`);
}

render(() => (
  isPlaygroundRoute(window.location.pathname) ? (
    <ThemeProvider theme={darkTheme}>
      <App />
    </ThemeProvider>
  ) : (
    <LandingPage />
  )
), root!);
