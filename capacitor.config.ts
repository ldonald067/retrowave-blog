import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.retrowave.journal',
  appName: 'My Journal',
  webDir: 'dist',
  server: {
    // Allow Supabase API calls from the WebView
    allowNavigation: ['*.supabase.co'],
    // In production, the app loads from the bundled dist/ directory.
    // For local dev, uncomment the url below to point at your Vite dev server:
    // url: 'http://localhost:5173',
  },
  ios: {
    // Full-screen content extending behind status bar and home indicator
    contentInset: 'automatic',
    // Use WKWebView (required for App Store)
    preferredContentMode: 'mobile',
  },
};

export default config;
