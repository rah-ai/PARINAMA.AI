/* ════════════════════════════════════════════════
   PARINAMA — Vite Configuration
   Dev server, proxy to FastAPI, build settings
   ════════════════════════════════════════════════ */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      /* Enable Fast Refresh */
      fastRefresh: true,
    }),
  ],

  /* ── Dev Server ────────────────────────────── */
  server: {
    port: 5173,
    open: true,
    cors: true,

    /* Proxy API & WebSocket to FastAPI backend */
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  /* ── Resolve ───────────────────────────────── */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },

  /* ── Build ─────────────────────────────────── */
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    target: 'es2020',

    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-d3': ['d3'],
          'vendor-recharts': ['recharts'],
        },
      },
    },

    /* Chunk size warning */
    chunkSizeWarningLimit: 600,
  },

  /* ── CSS ───────────────────────────────────── */
  css: {
    devSourcemap: true,
  },

  /* ── Optimizations ─────────────────────────── */
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'd3',
      'recharts',
      'zustand',
    ],
  },
});
