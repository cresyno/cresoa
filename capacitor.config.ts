import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ng.com.cresoa.app',
  appName: 'Cresoa',
  webDir: 'public',
  server: {
    url: 'https://google.com',
    cleartext: false,
    allowNavigation: ['*'],
    androidScheme: 'https'
  }
};

export default config;
