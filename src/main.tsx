import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { preloadCatalog } from './lib/catalog';
import { applyTheme, THEME_STORAGE_KEY } from './hooks/useTheme';
import './styles/global.css';

function initTheme(): void {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
  applyTheme(theme);
}

initTheme();
preloadCatalog('movies');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
