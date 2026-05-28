import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { preloadCatalog } from './lib/catalog';
import './styles/global.css';

document.documentElement.setAttribute('data-theme', 'dark');
preloadCatalog('movies');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
