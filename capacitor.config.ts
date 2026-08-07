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
    // 'never', not 'automatic': the app already pads for the notch and home
    // indicator itself via env(safe-area-inset-*) plus viewport-fit=cover, and
    // StatusBar.overlaysWebView is on. Letting WKWebView add its own inset on
    // top of that left the scroll view resting at a negative offset after a
    // full-page swap — a white band above the header with the status bar
    // unreadable, which window.scrollTo(0, 0) cannot clear because the document
    // is already at 0.
    contentInset: 'never',
    // Use WKWebView (required for App Store)
    preferredContentMode: 'mobile',
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      overlaysWebView: true,
    },
    SplashScreen: {
      // We hide the splash screen manually after auth session resolves
      // to prevent a flash of empty content.
      launchAutoHide: false,
    },
  },
};

export default config;
