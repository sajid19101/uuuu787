import { sqliteService } from '../database/sqlite-service';
import { filesystemService } from '../database/filesystem-service';
import { Device } from '@capacitor/device';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Profile, Video } from '../database/schema';
import { format } from 'date-fns';

// Type helper to convert undefined to null
function toNullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Offline API Service that mimics the REST API but uses SQLite directly
 * This service is used when the app is running in offline mode
 */
export class OfflineApiService {
  private static instance: OfflineApiService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): OfflineApiService {
    if (!OfflineApiService.instance) {
      OfflineApiService.instance = new OfflineApiService();
    }
    return OfflineApiService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Make sure SQLite is initialized
    await sqliteService.initialize();
    
    // Make sure filesystem is initialized
    await filesystemService.initialize();
    
    this.isInitialized = true;
  }

  // Profile methods
  async getProfiles(): Promise<Profile[]> {
    await this.ensureInitialized();
    return sqliteService.getProfiles();
  }

  async getProfile(id: number): Promise<Profile | null> {
    await this.ensureInitialized();
    const profile = await sqliteService.getProfile(id);
    return profile || null;
  }

  async createProfile(profile: Omit<Profile, 'id'>): Promise<Profile> {
    await this.ensureInitialized();
    return sqliteService.createProfile(profile);
  }

  async updateProfile(id: number, profile: Partial<Profile>): Promise<Profile | null> {
    await this.ensureInitialized();
    const result = await sqliteService.updateProfile(id, profile);
    return toNullable(result);
  }

  async deleteProfile(id: number): Promise<boolean> {
    await this.ensureInitialized();
    return sqliteService.deleteProfile(id);
  }

  async incrementProfilePushCount(profileId: number): Promise<Profile | null> {
    await this.ensureInitialized();
    const result = await sqliteService.incrementProfilePushCount(profileId);
    return toNullable(result);
  }

  async resetProfilePushCount(profileId: number): Promise<Profile | null> {
    await this.ensureInitialized();
    const result = await sqliteService.resetProfilePushCount(profileId);
    return toNullable(result);
  }

  // Video methods
  async getVideos(): Promise<Video[]> {
    await this.ensureInitialized();
    return sqliteService.getVideos();
  }

  async getVideosByProfile(profileId: number): Promise<Video[]> {
    await this.ensureInitialized();
    return sqliteService.getVideosByProfile(profileId);
  }

  async getVideosByStatus(status: string): Promise<Video[]> {
    await this.ensureInitialized();
    return sqliteService.getVideosByStatus(status);
  }

  async getVideosByStatusAndProfile(status: string, profileId: number): Promise<Video[]> {
    await this.ensureInitialized();
    // Filter videos by both status and profile ID
    const profileVideos = await sqliteService.getVideosByProfile(profileId);
    return profileVideos.filter(video => video.status === status);
  }

  async getVideosByDate(date: Date): Promise<Video[]> {
    await this.ensureInitialized();
    return sqliteService.getVideosByDate(date);
  }

  async getTodayVideos(): Promise<Video[]> {
    await this.ensureInitialized();
    const today = new Date();
    return sqliteService.getVideosByDate(today);
  }

  async getVideo(id: number): Promise<Video | null> {
    await this.ensureInitialized();
    return sqliteService.getVideo(id) || null;
  }

  async createVideo(video: Omit<Video, 'id'>): Promise<Video> {
    await this.ensureInitialized();
    
    // For offline mode, handle thumbnail creation here
    if (video.filePath) {
      try {
        // Generate a thumbnail if possible
        const thumbnailPath = await this.generateThumbnail(video.filePath);
        if (thumbnailPath) {
          video.thumbnailPath = thumbnailPath;
        }
      } catch (error) {
        console.error('Error generating thumbnail:', error);
      }
    }
    
    return sqliteService.createVideo(video);
  }

  async updateVideo(id: number, video: Partial<Video>): Promise<Video | null> {
    await this.ensureInitialized();
    return sqliteService.updateVideo(id, video) || null;
  }

  async deleteVideo(id: number): Promise<boolean> {
    await this.ensureInitialized();
    // Get the video first to delete associated files
    const video = await sqliteService.getVideo(id);
    if (video) {
      // Delete video files if they exist
      if (video.filePath) {
        await filesystemService.deleteFile(video.filePath).catch(e => console.error('Error deleting video file:', e));
      }
      if (video.thumbnailPath) {
        await filesystemService.deleteFile(video.thumbnailPath).catch(e => console.error('Error deleting thumbnail:', e));
      }
    }
    return sqliteService.deleteVideo(id);
  }

  async markVideoAsUploaded(id: number): Promise<Video | null> {
    await this.ensureInitialized();
    const video = await sqliteService.getVideo(id);
    if (!video) return null;
    
    const now = new Date();
    return sqliteService.updateVideo(id, {
      status: 'completed',
      uploadedDate: format(now, 'yyyy-MM-dd')
    });
  }

  async revertVideoUpload(id: number): Promise<Video | null> {
    await this.ensureInitialized();
    const video = await sqliteService.getVideo(id);
    if (!video) return null;
    
    return sqliteService.updateVideo(id, {
      status: 'pending',
      uploadedDate: null,
      youtubeLink: null
    });
  }

  // File handling methods
  async uploadVideoFile(videoId: number, filePath: string): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      // In offline mode, we just need to update the video record with the file path
      const video = await sqliteService.getVideo(videoId);
      if (!video) return false;
      
      // Copy the file to the videos directory if it's not already there
      if (!filePath.startsWith('videos/')) {
        const fileName = filePath.split('/').pop() || `video_${Date.now()}.mp4`;
        const newPath = `videos/${fileName}`;
        
        // Read source file and write to destination
        const fileData = await filesystemService.readFile(filePath);
        await filesystemService.writeFile(newPath, fileData);
        filePath = newPath;
      }
      
      // Generate thumbnail if possible
      let thumbnailPath = video.thumbnailPath;
      if (!thumbnailPath) {
        thumbnailPath = await this.generateThumbnail(filePath);
      }
      
      // Update video with file information
      await sqliteService.updateVideo(videoId, {
        filePath,
        isFileUploaded: true,
        thumbnailPath
      });
      
      return true;
    } catch (error) {
      console.error('Error uploading video file:', error);
      return false;
    }
  }

  // Helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private async generateThumbnail(videoPath: string): Promise<string | null> {
    // In a full implementation, we would use native capabilities to extract a frame
    // For now, we'll use a placeholder
    try {
      const fileName = videoPath.split('/').pop() || 'video';
      const thumbnailName = `${fileName.split('.')[0]}_thumbnail.jpg`;
      const thumbnailPath = `thumbs/${thumbnailName}`;
      
      // Check if we already have this thumbnail
      const exists = await filesystemService.fileExists(thumbnailPath);
      if (exists) {
        return thumbnailPath;
      }
      
      // In a real implementation, we would:
      // 1. Use native capabilities to extract a frame
      // 2. Save the frame as a thumbnail
      // 3. Return the path to the thumbnail
      
      // For now, we'll use a placeholder by creating an empty file
      await filesystemService.writeFile(
        thumbnailPath,
        new Uint8Array([]), // Empty file as placeholder
        { recursive: true }
      );
      
      return thumbnailPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  // Data export/import
  async exportData(): Promise<{ profiles: Profile[], videos: Video[] }> {
    await this.ensureInitialized();
    const profiles = await sqliteService.getProfiles();
    const videos = await sqliteService.getVideos();
    return { profiles, videos };
  }

  async importData(data: { profiles: Profile[], videos: Video[] }): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      // First import profiles
      for (const profile of data.profiles) {
        // Skip id to let SQLite assign a new one
        const { id, ...profileData } = profile;
        await sqliteService.createProfile(profileData);
      }
      
      // Then import videos
      for (const video of data.videos) {
        // Skip id to let SQLite assign a new one
        const { id, ...videoData } = video;
        await sqliteService.createVideo(videoData);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const offlineApiService = OfflineApiService.getInstance();