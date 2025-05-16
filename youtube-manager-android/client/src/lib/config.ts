/**
 * Main configuration file for YouTube Schedule Manager
 */

// Define this as false to use SQLite local storage instead of server API
export const USE_SERVER_API = false;

// Base URL for API calls (for server mode only)
export const API_BASE_URL = window.location.origin;

// For Capacitor file access - development URL
export const CAPACITOR_DEV_URL = 'http://localhost:5000';

// Secret code for authentication
export const DEFAULT_SECRET_CODE = 'Jalbai1234';

// App global settings
export const APP_SETTINGS = {
  // Time in days to auto-logout (30 days)
  SESSION_DURATION: 30,
  
  // Default daily upload limit per profile
  DEFAULT_DAILY_PUSH_LIMIT: 10,
  
  // Maximum file size for video uploads (in bytes, default 2GB)
  MAX_VIDEO_FILE_SIZE: 2 * 1024 * 1024 * 1024,
  
  // Use placeholder for videos (smaller storage)
  USE_PLACEHOLDER_FILES: true,
  
  // Maximum placeholder file size (in bytes, default 5MB)
  MAX_PLACEHOLDER_SIZE: 5 * 1024 * 1024,
  
  // Default video formats supported
  SUPPORTED_VIDEO_FORMATS: ['mp4', 'mov', 'avi', 'webm', 'mkv'],
};
