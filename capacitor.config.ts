import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e925fb7503fc426380d5abbe0769e5dd',
  appName: 'CIMVERSE',
  webDir: 'dist',
  server: {
    url: 'https://e925fb75-03fc-4263-80d5-abbe0769e5dd.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0b2545',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // AdMob — TEST app IDs by default. Replace with your real IDs before production.
    AdMob: {
      appId: {
        android: 'ca-app-pub-3940256099942544~3347511713',
        ios: 'ca-app-pub-3940256099942544~1458002511',
      },
    },
  },
};

export default config;
