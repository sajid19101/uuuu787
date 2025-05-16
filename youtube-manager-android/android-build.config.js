/**
 * YouTube Schedule Manager - Android Build Configuration
 * 
 * This config file handles the build process for creating the standalone Android APK.
 * It defines the build steps, configuration options, and optimization settings.
 */

module.exports = {
  // Application metadata
  app: {
    name: 'YouTube Schedule Manager',
    package: 'com.youtubeuploader.app',
    versionName: '1.0.0',
    versionCode: 1,
    minSdkVersion: 22,
    targetSdkVersion: 33
  },
  
  // Build configuration
  build: {
    // Entry point for the Android app
    entryPoint: './client/src/main-android.tsx',
    
    // Output directory for the build artifacts
    outputDir: './android-build',
    
    // Assets to include in the APK
    assets: [
      { src: './assets/icon.png', dest: 'app/src/main/res/mipmap/' },
      { src: './assets/splash.png', dest: 'app/src/main/res/drawable/' }
    ],
    
    // Android manifest overrides
    manifestOverrides: {
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.CAMERA',
        'android.permission.MANAGE_EXTERNAL_STORAGE'
      ]
    }
  },
  
  // Capacitor configuration
  capacitor: {
    // Plugins to include
    plugins: [
      '@capacitor/app',
      '@capacitor/core',
      '@capacitor/filesystem',
      '@capacitor/device',
      '@capacitor/preferences',
      '@capacitor-community/sqlite',
      '@capacitor-community/file-opener'
    ],
    
    // Capacitor configuration overrides
    config: {
      webDir: 'dist/public',
      android: {
        path: './android'
      }
    }
  },
  
  // Build optimization settings
  optimization: {
    // Enable code splitting for better performance
    splitChunks: true,
    
    // Minify output
    minify: true,
    
    // Remove console.log statements in production
    removeConsoleStatements: true,
    
    // Image optimization settings
    images: {
      compress: true,
      quality: 80
    }
  }
};