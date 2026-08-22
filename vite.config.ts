import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-icons': ['lucide-react', 'pepicons'],
          'vendor-motion': ['framer-motion'],
          'vendor-markdown': ['react-markdown', 'rehype-sanitize'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-capacitor': [
            '@capacitor/app',
            '@capacitor/browser',
            '@capacitor/core',
            '@capacitor/haptics',
            '@capacitor/keyboard',
            '@capacitor/network',
            '@capacitor/preferences',
            '@capacitor/share',
            '@capacitor/splash-screen',
            '@capacitor/status-bar',
          ],
          'vendor-utils': ['@tanstack/react-virtual', 'date-fns'],
        },
      },
    },
  },
  server: {
    port: 5174,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    // src/lib/supabase.ts throws at import time when these are missing — a
    // deliberate production guard. Any test file that transitively imports it
    // therefore failed to load anywhere the developer's .env.local was absent,
    // which meant CI, and any fresh clone. Tests mock Supabase, so they need
    // the variables to exist, not to be real. Placeholders here keep the
    // production guard intact while making the suite self-contained.
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'test-placeholder-not-a-real-credential',
    },
  },
});
