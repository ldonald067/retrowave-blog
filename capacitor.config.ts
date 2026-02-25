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
  plugins: {
    Keyboard: {
      // Resize the web view body (not the native viewport) when the keyboard opens.
      // Prevents modals from being pushed off-screen on iPhone.
      resize: 'body',
    },
    SplashScreen: {
      // We hide the splash screen manually after auth session resolves
      // to prevent a flash of empty content.
      launchAutoHide: false,
    },
  },
};

export default config;
