import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.retrowave.journal',
  appName: 'My Journal',
  webDir: 'dist',
  server: {
    // In production, the app loads from the bundled dist/ directory.
    // For local dev, uncomment the url below to point at your Vite dev server:
    // url: 'http://localhost:5173',
  },
};

export default config;
