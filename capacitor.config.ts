import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ng.com.cresoa.app',
  appName: 'Cresoa',
  webDir: 'public',
  server: {
    url: 'https://cresoa.com.ng',
    cleartext: false,
    allowNavigation: ['cresoa.com.ng']
  }
};

export default config;

