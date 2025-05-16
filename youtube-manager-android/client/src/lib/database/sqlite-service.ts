import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Device } from '@capacitor/device';
import { Profile, Video, CREATE_PROFILES_TABLE, CREATE_VIDEOS_TABLE } from './schema';
import { format, parse, isValid } from 'date-fns';

export class SQLiteService {
  private static instance: SQLiteService;
  private sqlite: SQLiteConnection;
  private db!: SQLiteDBConnection;
  private _isInitialized = false;
  private DB_NAME = 'youtube_planner.db';
  private DB_VERSION = 1;
  
  public get isInitialized(): boolean {
    return this._isInitialized;
  }

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  public static getInstance(): SQLiteService {
    if (!SQLiteService.instance) {
      SQLiteService.instance = new SQLiteService();
    }
    return SQLiteService.instance;
  }

  public async initialize(): Promise<void> {
    if (this._isInitialized) return;

    try {
      const info = await Device.getInfo();
      const isNative = info.platform !== 'web';

      if (isNative) {
        await this.initializeNative();
      } else {
        await this.initializeWeb();
      }

      // Create database schema
      await this.createTables();
      
      this._isInitialized = true;
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      throw error;
    }
  }

  private async initializeNative(): Promise<void> {
    // Check if database exists
    const result = await this.sqlite.isDatabase({
      database: this.DB_NAME
    });

    if (result.result) {
      // Open existing database
      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        this.DB_VERSION,
        false
      );
    } else {
      // Create new database
      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        this.DB_VERSION,
        false
      );
    }

    await this.db.open();
  }

  private async initializeWeb(): Promise<void> {
    // For web environments, use the SQLite Web Assembly version
    try {
      // Check if jeep-sqlite is defined
      const jeepSqliteEl = document.querySelector('jeep-sqlite');
      if (jeepSqliteEl == null) {
        // If not, create the element
        const jeepSqlite = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepSqlite);
        await customElements.whenDefined('jeep-sqlite');
        await this.sqlite.initWebStore();
      }
      
      // Create database connection
      this.db = await this.sqlite.createConnection(
        this.DB_NAME, 
        false, 
        'no-encryption', 
        this.DB_VERSION,
        false
      );
      
      await this.db.open();
    } catch (error) {
      console.error('Error initializing SQLite in web environment:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    try {
      // Create the profiles table
      await this.db.execute(CREATE_PROFILES_TABLE);
      
      // Create the videos table
      await this.db.execute(CREATE_VIDEOS_TABLE);
      
      console.log('Database schema created successfully');
    } catch (error) {
      console.error('Error creating database schema:', error);
      throw error;
    }
  }

  // Profile methods
  async getProfiles(): Promise<Profile[]> {
    const query = 'SELECT * FROM profiles ORDER BY name ASC';
    const result = await this.db.query(query);
    return this.mapProfileResults(result.values || []);
  }

  async getProfile(id: number): Promise<Profile | undefined> {
    const query = 'SELECT * FROM profiles WHERE id = ?';
    const result = await this.db.query(query, [id]);
    if (!result.values || result.values.length === 0) {
      return undefined;
    }
    return this.mapProfileResult(result.values[0]);
  }

  async createProfile(profile: Omit<Profile, 'id'>): Promise<Profile> {
    const query = `
      INSERT INTO profiles (name, channelName, channelLink, dailyPushCount, lastPushReset)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await this.db.run(query, [
      profile.name,
      profile.channelName,
      profile.channelLink,
      profile.dailyPushCount || 0,
      profile.lastPushReset || null
    ]);
    
    return {
      id: result.lastId!,
      ...profile
    };
  }

  async updateProfile(id: number, profile: Partial<Profile>): Promise<Profile | undefined> {
    // Build the update query dynamically based on which fields are being updated
    const fields: string[] = [];
    const values: any[] = [];
    
    if (profile.name !== undefined) {
      fields.push('name = ?');
      values.push(profile.name);
    }
    
    if (profile.channelName !== undefined) {
      fields.push('channelName = ?');
      values.push(profile.channelName);
    }
    
    if (profile.channelLink !== undefined) {
      fields.push('channelLink = ?');
      values.push(profile.channelLink);
    }
    
    if (profile.dailyPushCount !== undefined) {
      fields.push('dailyPushCount = ?');
      values.push(profile.dailyPushCount);
    }
    
    if (profile.lastPushReset !== undefined) {
      fields.push('lastPushReset = ?');
      values.push(profile.lastPushReset);
    }
    
    if (fields.length === 0) {
      return this.getProfile(id);
    }
    
    const query = `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    
    await this.db.run(query, values);
    
    return this.getProfile(id);
  }

  async deleteProfile(id: number): Promise<boolean> {
    const query = 'DELETE FROM profiles WHERE id = ?';
    const result = await this.db.run(query, [id]);
    return result.changes !== undefined && result.changes > 0;
  }

  async incrementProfilePushCount(profileId: number): Promise<Profile | undefined> {
    const profile = await this.getProfile(profileId);
    if (!profile) return undefined;
    
    // Check if we need to reset the count (if 24 hours have passed)
    const shouldReset = profile.lastPushReset ? 
      this.has24HoursPassed(new Date(profile.lastPushReset)) : 
      true;
    
    if (shouldReset) {
      // Reset count and update last reset time
      const now = new Date();
      return this.updateProfile(profileId, { 
        dailyPushCount: 1,
        lastPushReset: format(now, 'yyyy-MM-dd HH:mm:ss')
      });
    } else {
      // Increment the count
      return this.updateProfile(profileId, { 
        dailyPushCount: profile.dailyPushCount + 1 
      });
    }
  }

  async resetProfilePushCount(profileId: number): Promise<Profile | undefined> {
    const now = new Date();
    return this.updateProfile(profileId, {
      dailyPushCount: 0,
      lastPushReset: format(now, 'yyyy-MM-dd HH:mm:ss')
    });
  }

  // Video methods
  async getVideos(): Promise<Video[]> {
    const query = 'SELECT * FROM videos ORDER BY scheduleDate DESC';
    const result = await this.db.query(query);
    return this.mapVideoResults(result.values || []);
  }

  async getVideosByProfile(profileId: number): Promise<Video[]> {
    const query = 'SELECT * FROM videos WHERE profileId = ? ORDER BY scheduleDate DESC';
    const result = await this.db.query(query, [profileId]);
    return this.mapVideoResults(result.values || []);
  }

  async getVideosByStatus(status: string): Promise<Video[]> {
    const query = 'SELECT * FROM videos WHERE status = ? ORDER BY scheduleDate DESC';
    const result = await this.db.query(query, [status]);
    return this.mapVideoResults(result.values || []);
  }

  async getVideosByDate(date: Date): Promise<Video[]> {
    const dateString = format(date, 'yyyy-MM-dd');
    const query = 'SELECT * FROM videos WHERE date(scheduleDate) = ? ORDER BY scheduleDate ASC';
    const result = await this.db.query(query, [dateString]);
    return this.mapVideoResults(result.values || []);
  }

  async getVideo(id: number): Promise<Video | undefined> {
    const query = 'SELECT * FROM videos WHERE id = ?';
    const result = await this.db.query(query, [id]);
    if (!result.values || result.values.length === 0) {
      return undefined;
    }
    return this.mapVideoResult(result.values[0]);
  }

  async createVideo(video: Omit<Video, 'id'>): Promise<Video> {
    const query = `
      INSERT INTO videos (
        profileId, title, description, filePath, fileName, fileSize,
        originalFilePath, originalFileSize, thumbnailPath, duration,
        scheduleDate, status, uploadedDate, youtubeLink, isFileUploaded, isPlaceholder
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.db.run(query, [
      video.profileId,
      video.title,
      video.description,
      video.filePath || null,
      video.fileName || null,
      video.fileSize || null,
      video.originalFilePath || null,
      video.originalFileSize || null,
      video.thumbnailPath || null,
      video.duration || null,
      video.scheduleDate,
      video.status || 'pending',
      video.uploadedDate || null,
      video.youtubeLink || null,
      video.isFileUploaded ? 1 : 0,
      video.isPlaceholder ? 1 : 0
    ]);
    
    return {
      id: result.lastId!,
      ...video
    };
  }

  async updateVideo(id: number, video: Partial<Video>): Promise<Video | undefined> {
    // Build the update query dynamically based on which fields are being updated
    const fields: string[] = [];
    const values: any[] = [];
    
    if (video.profileId !== undefined) {
      fields.push('profileId = ?');
      values.push(video.profileId);
    }
    
    if (video.title !== undefined) {
      fields.push('title = ?');
      values.push(video.title);
    }
    
    if (video.description !== undefined) {
      fields.push('description = ?');
      values.push(video.description);
    }
    
    if (video.filePath !== undefined) {
      fields.push('filePath = ?');
      values.push(video.filePath);
    }
    
    if (video.fileName !== undefined) {
      fields.push('fileName = ?');
      values.push(video.fileName);
    }
    
    if (video.fileSize !== undefined) {
      fields.push('fileSize = ?');
      values.push(video.fileSize);
    }
    
    if (video.originalFilePath !== undefined) {
      fields.push('originalFilePath = ?');
      values.push(video.originalFilePath);
    }
    
    if (video.originalFileSize !== undefined) {
      fields.push('originalFileSize = ?');
      values.push(video.originalFileSize);
    }
    
    if (video.thumbnailPath !== undefined) {
      fields.push('thumbnailPath = ?');
      values.push(video.thumbnailPath);
    }
    
    if (video.duration !== undefined) {
      fields.push('duration = ?');
      values.push(video.duration);
    }
    
    if (video.scheduleDate !== undefined) {
      fields.push('scheduleDate = ?');
      values.push(video.scheduleDate);
    }
    
    if (video.status !== undefined) {
      fields.push('status = ?');
      values.push(video.status);
    }
    
    if (video.uploadedDate !== undefined) {
      fields.push('uploadedDate = ?');
      values.push(video.uploadedDate);
    }
    
    if (video.youtubeLink !== undefined) {
      fields.push('youtubeLink = ?');
      values.push(video.youtubeLink);
    }
    
    if (video.isFileUploaded !== undefined) {
      fields.push('isFileUploaded = ?');
      values.push(video.isFileUploaded ? 1 : 0);
    }
    
    if (video.isPlaceholder !== undefined) {
      fields.push('isPlaceholder = ?');
      values.push(video.isPlaceholder ? 1 : 0);
    }
    
    if (fields.length === 0) {
      return this.getVideo(id);
    }
    
    const query = `UPDATE videos SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    
    await this.db.run(query, values);
    
    return this.getVideo(id);
  }

  async deleteVideo(id: number): Promise<boolean> {
    const query = 'DELETE FROM videos WHERE id = ?';
    const result = await this.db.run(query, [id]);
    return result.changes !== undefined && result.changes > 0;
  }

  // Helper methods
  private mapProfileResults(profiles: any[]): Profile[] {
    return profiles.map(p => this.mapProfileResult(p));
  }

  private mapProfileResult(p: any): Profile {
    return {
      id: p.id,
      name: p.name,
      channelName: p.channelName,
      channelLink: p.channelLink,
      dailyPushCount: p.dailyPushCount,
      lastPushReset: p.lastPushReset
    };
  }

  private mapVideoResults(videos: any[]): Video[] {
    return videos.map(v => this.mapVideoResult(v));
  }

  private mapVideoResult(v: any): Video {
    return {
      id: v.id,
      profileId: v.profileId,
      title: v.title,
      description: v.description,
      filePath: v.filePath,
      fileName: v.fileName,
      fileSize: v.fileSize,
      originalFilePath: v.originalFilePath,
      originalFileSize: v.originalFileSize,
      thumbnailPath: v.thumbnailPath,
      duration: v.duration,
      scheduleDate: v.scheduleDate,
      status: v.status,
      uploadedDate: v.uploadedDate,
      youtubeLink: v.youtubeLink,
      isFileUploaded: Boolean(v.isFileUploaded),
      isPlaceholder: Boolean(v.isPlaceholder)
    };
  }

  /**
   * Checks if 24 hours have passed since a given date
   * @param lastResetDate The date to check against
   * @returns boolean indicating if 24 hours have passed
   */
  private has24HoursPassed(lastResetDate: Date): boolean {
    if (!isValid(lastResetDate)) return true;
    
    const now = new Date();
    const diffMs = now.getTime() - lastResetDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours >= 24;
  }

  // Close database connection
  async closeConnection(): Promise<void> {
    try {
      await this.sqlite.closeConnection(this.DB_NAME, false);
      this.isInitialized = false;
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Export a singleton instance
export const sqliteService = SQLiteService.getInstance();