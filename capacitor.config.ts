import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vendoros.app',
  appName: 'VendorOS',
  webDir: 'public',
  server: {
    url: 'https://vendoros-app.vercel.app',
    cleartext: true
  }
};

export default config;
