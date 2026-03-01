import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // bcryptjs: peka på browser-versionen för att undvika Node crypto-varning
      bcryptjs: path.resolve(__dirname, 'node_modules/bcryptjs/dist/bcrypt.js'),
    },
  },
  // pdfjs-dist 3.x kräver att worker-filen kopieras till dist
  // och refereras via en absolut URL i runtime
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
