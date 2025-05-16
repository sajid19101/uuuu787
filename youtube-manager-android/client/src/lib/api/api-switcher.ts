import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { offlineApiService } from './offline-api-service';
import { API_BASE_URL, CAPACITOR_DEV_URL } from '../config';

/**
 * API switcher for toggling between online and offline modes
 * This service detects the device's connection status and switches
 * between online and offline API services automatically.
 */

// Connection states
export type ConnectionState = 'online' | 'offline' | 'detecting';

// Storage key for offline mode preference
const OFFLINE_MODE_KEY = 'offline_mode_preference';

/**
 * Check if we're running in a Capacitor environment
 */
export async function isNativeApp(): Promise<boolean> {
  try {
    const info = await Device.getInfo();
    return info.platform === 'android' || info.platform === 'ios';
  } catch (e) {
    console.error('Error checking device info:', e);
    return false;
  }
}

/**
 * Check if the device is offline or if offline mode is forced
 */
export async function isOfflineMode(): Promise<boolean> {
  try {
    // Check if offline mode is forced via preferences
    const { value } = await Preferences.get({ key: OFFLINE_MODE_KEY });
    if (value === 'forced') {
      return true;
    }
    
    // Check if we're in a native environment
    const nativeApp = await isNativeApp();
    if (!nativeApp) {
      // Web environment always defaults to online
      return false;
    }
    
    // Otherwise, let the app auto-detect
    return value === 'true';
  } catch (e) {
    console.error('Error checking offline mode:', e);
    return false;
  }
}

/**
 * Set the offline mode preference
 */
export async function setOfflineMode(enabled: boolean, forced = false): Promise<void> {
  try {
    await Preferences.set({
      key: OFFLINE_MODE_KEY,
      value: forced ? 'forced' : enabled ? 'true' : 'false'
    });
  } catch (e) {
    console.error('Error setting offline mode:', e);
  }
}

/**
 * Get the correct API base URL
 */
export async function getApiBaseUrl(): Promise<string> {
  // If we're in offline mode, there's no base URL (using direct SQLite calls)
  if (await isOfflineMode()) {
    return '';
  }
  
  // Check if we're in a Capacitor environment
  if (await isNativeApp()) {
    // Return the development URL when running in Capacitor
    return CAPACITOR_DEV_URL;
  }
  
  // Otherwise, use the default API URL
  return API_BASE_URL;
}

/**
 * Initialize offline capabilities if needed
 */
export async function initializeOfflineCapabilities(): Promise<void> {
  if (await isNativeApp()) {
    // Initialize offline services
    await offlineApiService.initialize();
    console.log('Offline API service initialized');
  }
}

/**
 * Make an API request, falling back to offline mode if necessary
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  offlineHandler?: () => Promise<T>
): Promise<T> {
  // Check if we're in offline mode
  if (await isOfflineMode()) {
    if (!offlineHandler) {
      throw new Error('Offline mode active but no offline handler provided');
    }
    return offlineHandler();
  }
  
  // Get the base URL
  const baseUrl = await getApiBaseUrl();
  
  // Make the online request
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    // Handle network errors
    console.error('API request failed:', error);
    
    // If we have an offline handler, try it as a fallback
    if (offlineHandler) {
      // Auto-switch to offline mode
      await setOfflineMode(true);
      console.log('Auto-switching to offline mode due to network error');
      return offlineHandler();
    }
    
    throw error;
  }
}