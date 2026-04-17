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
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react', 'pepicons', 'react-old-icons'],
          'vendor-motion': ['framer-motion'],
          'vendor-markdown': ['react-markdown', 'rehype-sanitize'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-capacitor': [
            '@capacitor/app',
            '@capacitor/browser',
            '@capacitor/core',
            '@capacitor/haptics',
            '@capacitor/keyboard',
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
  },
});
