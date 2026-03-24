import './index.css';
import { render } from 'solid-js/web';
import { ThemeProvider, createTheme } from '@suid/material/styles';

import App from './App';

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

render(() => (
  <ThemeProvider theme={darkTheme}>
    <App />
  </ThemeProvider>
), root!);
