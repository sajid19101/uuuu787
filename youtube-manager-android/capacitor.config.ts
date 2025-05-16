import { CapacitorConfig } from '@capacitor/cli';

/**
 * YouTube Schedule Manager - Capacitor Configuration
 * This configuration is used to build the native mobile application
 */
const config: CapacitorConfig = {
  appId: 'com.youtubeuploader.app',
  appName: 'YouTube Schedule Manager',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Configure permissions for Android
    Permissions: {
      // These match the Android manifest permissions
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.MANAGE_EXTERNAL_STORAGE',
        'android.permission.CAMERA',
        'android.permission.VIBRATE',
        'android.permission.WAKE_LOCK',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_IMAGES'
      ]
    },
    // Configure file system access
    Filesystem: {
      accessFilesystemInWebView: true
    },
    // Configure SQLite for local database
    CapacitorSQLite: {
      iosLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeystoreLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false,
      androidLocation: 'database',
      electronWindowsLocation: 'sqlite'
    },
    // Configure status bar appearance
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    }
  },
  android: {
    // Copy the AndroidManifest.xml to the right location
    // Use a string value for overrideUserAgent instead of boolean
    overrideUserAgent: 'YouTubeScheduleManager',
    backgroundColor: '#FFFFFF',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;