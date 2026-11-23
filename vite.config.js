import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static, backend-free build. `base: './'` lets the bundle work from any
// sub-path (Netlify, Vercel, GitHub Pages) and from a plain file server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { sourcemap: false, chunkSizeWarningLimit: 700 },
});
