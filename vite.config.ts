import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the browser talks to /api on its own origin and Vite forwards it to the FastAPI service, so no CORS setup is needed.
const apiTarget = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8015';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  test: { environment: 'node', include: ['src/__tests__/**/*.test.ts'] },
});
