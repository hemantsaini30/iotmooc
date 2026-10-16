import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api requests are proxied to the local Express server (npm run dev:api).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:5000' } },
});
