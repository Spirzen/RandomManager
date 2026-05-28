import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Для GitHub Pages: задайте base как '/имя-репозитория/' или оставьте './' для user.github.io
const base = process.env.GITHUB_PAGES_BASE ?? './';

export default defineConfig({
  base,
  plugins: [react()],
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('data/movies.json')) return 'catalog-movies';
          if (id.includes('data/games.json')) return 'catalog-games';
          if (id.includes('data/books.json')) return 'catalog-books';
        },
      },
    },
  },
});
