// Chibuike build config — Pluma Frame Next.
// Dev server binds 0.0.0.0 so the sandbox preview proxy can reach it,
// and allows proxy hosts so HMR works behind the e2b preview.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443, protocol: 'wss' }
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          qr: ['qrcode-generator']
        }
      }
    }
  }
});
