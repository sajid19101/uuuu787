/**
 * Database schema for offline SQLite database
 * This matches the schema defined in the shared/schema.ts file
 * but adapted for SQLite
 */

export interface Profile {
  id: number;
  name: string;
  channelName: string;
  channelLink: string;
  dailyPushCount: number;
  lastPushReset: string | null;
}

export interface Video {
  id: number;
  profileId: number;
  title: string;
  description: string;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  originalFilePath: string | null;
  originalFileSize: number | null;
  thumbnailPath: string | null;
  duration: string | null;
  scheduleDate: string;
  status: string;
  uploadedDate: string | null;
  youtubeLink: string | null;
  isFileUploaded: boolean;
  isPlaceholder: boolean;
}

// SQL statements for creating tables
export const CREATE_PROFILES_TABLE = `
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  channelName TEXT NOT NULL,
  channelLink TEXT NOT NULL,
  dailyPushCount INTEGER NOT NULL DEFAULT 0,
  lastPushReset TEXT
);
`;

export const CREATE_VIDEOS_TABLE = `
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profileId INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  filePath TEXT,
  fileName TEXT,
  fileSize INTEGER,
  originalFilePath TEXT,
  originalFileSize INTEGER,
  thumbnailPath TEXT,
  duration TEXT,
  scheduleDate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  uploadedDate TEXT,
  youtubeLink TEXT,
  isFileUploaded INTEGER NOT NULL DEFAULT 0,
  isPlaceholder INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE CASCADE
);
`;