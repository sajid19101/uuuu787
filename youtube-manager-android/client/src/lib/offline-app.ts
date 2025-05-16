import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { sqliteService } from './database/sqlite-service';
import { filesystemService } from './database/filesystem-service';
import { initializeOfflineCapabilities, setOfflineMode } from './api/api-switcher';

/**
 * Offline app initialization and lifecycle management
 * This module handles app startup, background, and foreground events
 * for the standalone Android application
 */

// Default configuration
const APP_VERSION = '1.0.0';
const APP_NAME = 'YouTube Schedule Manager';
const DEFAULT_PROFILE_NAME = 'My YouTube Channel';

// Initialize the native app functionality
export async function initializeNativeApp(): Promise<void> {
  console.log('Initializing native app capabilities...');
  
  try {
    // Register app lifecycle handlers
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        console.log('App has entered the foreground');
        onAppForeground();
      } else {
        console.log('App has entered the background');
        onAppBackground();
      }
    });
    
    // Set offline mode by default for native apps
    await setOfflineMode(true);
    
    // Initialize all offline capabilities
    await initializeOfflineCapabilities();
    
    // Check if this is first run and perform first-time setup if needed
    await checkFirstRun();
    
    console.log('Native app initialization complete');
  } catch (error) {
    console.error('Error initializing native app:', error);
  }
}

// Called when app enters the foreground
async function onAppForeground(): Promise<void> {
  try {
    // Re-initialize SQLite if needed
    if (!sqliteService.isInitialized) {
      await sqliteService.initialize();
    }
    
    // Perform any background data sync if needed
    // (This would be implemented if we wanted to sync with a cloud server)
  } catch (error) {
    console.error('Error handling app foreground:', error);
  }
}

// Called when app enters the background
async function onAppBackground(): Promise<void> {
  try {
    // Save any pending state
    console.log('Saving app state before entering background...');
    
    // Disconnect from database to free resources
    // (Comment out if you need background processing)
    // await sqliteService.closeConnection();
  } catch (error) {
    console.error('Error handling app background:', error);
  }
}

// Check if this is the first run of the app and set up initial data
async function checkFirstRun(): Promise<void> {
  try {
    // Check if the app has been run before
    const { value: firstRunCompleted } = await Preferences.get({ key: 'first_run_completed' });
    
    if (!firstRunCompleted) {
      console.log('First run detected, setting up initial data...');
      
      // Create example profile if none exists
      const profiles = await sqliteService.getProfiles();
      
      if (profiles.length === 0) {
        console.log('Creating default profile...');
        await sqliteService.createProfile({
          name: DEFAULT_PROFILE_NAME,
          channelName: '@mychannel',
          channelLink: 'https://youtube.com/@mychannel',
          dailyPushCount: 0,
          lastPushReset: null
        });
      }
      
      // Mark first run as completed
      await Preferences.set({
        key: 'first_run_completed',
        value: 'true'
      });
      
      // Store app version
      await Preferences.set({
        key: 'app_version',
        value: APP_VERSION
      });
    } else {
      // Check for app updates and perform any migration if needed
      const { value: storedVersion } = await Preferences.get({ key: 'app_version' });
      
      if (storedVersion !== APP_VERSION) {
        console.log(`App updated from ${storedVersion} to ${APP_VERSION}`);
        // Perform any version-specific migrations here
        
        // Update stored app version
        await Preferences.set({
          key: 'app_version',
          value: APP_VERSION
        });
      }
    }
  } catch (error) {
    console.error('Error during first run check:', error);
  }
}