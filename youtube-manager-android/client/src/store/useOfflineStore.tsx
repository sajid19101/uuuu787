import { create } from 'zustand';
import { apiService } from '../lib/database/api-service';
import { Video, Profile } from '../lib/database/schema';
import { filesystemService } from '../lib/database/filesystem-service';

interface AppState {
  videos: Video[];
  profiles: Profile[];
  todayVideos: Video[];
  selectedProfile: Profile | null;
  isLoading: boolean;
  error: string | null;
  
  // Profile actions
  fetchProfiles: () => Promise<void>;
  fetchProfile: (id: number) => Promise<Profile | null>;
  createProfile: (profile: Omit<Profile, 'id'>) => Promise<Profile>;
  updateProfile: (id: number, profile: Partial<Profile>) => Promise<Profile | null>;
  deleteProfile: (id: number) => Promise<boolean>;
  selectProfile: (id: number) => void;
  resetProfileSelection: () => void;
  getProfilePushCount: (profileId: number) => Promise<{dailyPushCount: number, lastReset: string | null}>;
  resetProfilePushCount: (profileId: number) => Promise<Profile | null>;
  
  // Video actions
  fetchVideos: () => Promise<void>;
  fetchTodayVideos: () => Promise<void>;
  fetchVideo: (id: number) => Promise<Video | null>;
  fetchVideosByProfile: (profileId: number) => Promise<Video[]>;
  createVideo: (video: Omit<Video, 'id'>) => Promise<Video>;
  updateVideo: (id: number, video: Partial<Video>) => Promise<Video | null>;
  deleteVideo: (id: number) => Promise<boolean>;
  markVideoAsUploaded: (id: number) => Promise<Video | null>;
  revertVideoUpload: (id: number) => Promise<Video | null>;
  openVideoInPlayer: (id: number) => Promise<boolean>;
  
  // File operations
  importVideoFromDevice: (videoInfo: {
    title: string;
    description: string;
    profileId: number;
    scheduleDate: Date | string;
    filePath: string;
    fileName: string;
    fileSize: number;
  }) => Promise<Video>;
}

export const useOfflineStore = create<AppState>((set, get) => ({
  videos: [],
  profiles: [],
  todayVideos: [],
  selectedProfile: null,
  isLoading: false,
  error: null,
  
  // Profile actions
  fetchProfiles: async () => {
    try {
      set({ isLoading: true, error: null });
      const profiles = await apiService.getProfiles();
      set({ profiles, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch profiles', 
        isLoading: false 
      });
    }
  },
  
  fetchProfile: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      const profile = await apiService.getProfile(id);
      set({ isLoading: false });
      return profile;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch profile', 
        isLoading: false 
      });
      return null;
    }
  },
  
  createProfile: async (profile) => {
    try {
      set({ isLoading: true, error: null });
      const newProfile = await apiService.createProfile(profile);
      set((state) => ({
        profiles: [...state.profiles, newProfile],
        isLoading: false
      }));
      return newProfile;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create profile', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateProfile: async (id, profile) => {
    try {
      set({ isLoading: true, error: null });
      const updatedProfile = await apiService.updateProfile(id, profile);
      if (updatedProfile) {
        set((state) => ({
          profiles: state.profiles.map(p => p.id === id ? updatedProfile : p),
          selectedProfile: state.selectedProfile?.id === id ? updatedProfile : state.selectedProfile,
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      return updatedProfile;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update profile', 
        isLoading: false 
      });
      return null;
    }
  },
  
  deleteProfile: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const success = await apiService.deleteProfile(id);
      if (success) {
        set((state) => ({
          profiles: state.profiles.filter(p => p.id !== id),
          selectedProfile: state.selectedProfile?.id === id ? null : state.selectedProfile,
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      return success;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete profile', 
        isLoading: false 
      });
      return false;
    }
  },
  
  selectProfile: (id) => {
    const profile = get().profiles.find(p => p.id === id) || null;
    set({ selectedProfile: profile });
  },
  
  resetProfileSelection: () => {
    set({ selectedProfile: null });
  },
  
  getProfilePushCount: async (profileId) => {
    try {
      return await apiService.getProfilePushCount(profileId);
    } catch (error) {
      console.error('Failed to get profile push count:', error);
      return { dailyPushCount: 0, lastReset: null };
    }
  },
  
  resetProfilePushCount: async (profileId) => {
    try {
      return await apiService.resetProfilePushCount(profileId);
    } catch (error) {
      console.error('Failed to reset profile push count:', error);
      return null;
    }
  },
  
  // Video actions
  fetchVideos: async () => {
    try {
      set({ isLoading: true, error: null });
      const videos = await apiService.getVideos();
      set({ videos, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch videos', 
        isLoading: false 
      });
    }
  },
  
  fetchTodayVideos: async () => {
    try {
      set({ isLoading: true, error: null });
      const todayVideos = await apiService.getTodayVideos();
      set({ todayVideos, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch today\'s videos', 
        isLoading: false 
      });
    }
  },
  
  fetchVideo: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const video = await apiService.getVideo(id);
      set({ isLoading: false });
      return video;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch video', 
        isLoading: false 
      });
      return null;
    }
  },
  
  fetchVideosByProfile: async (profileId) => {
    try {
      set({ isLoading: true, error: null });
      const videos = await apiService.getVideosByProfile(profileId);
      set({ isLoading: false });
      return videos;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch videos by profile', 
        isLoading: false 
      });
      return [];
    }
  },
  
  createVideo: async (video) => {
    try {
      set({ isLoading: true, error: null });
      const newVideo = await apiService.createVideo(video);
      set((state) => ({
        videos: [...state.videos, newVideo],
        isLoading: false
      }));
      return newVideo;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create video', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  updateVideo: async (id, video) => {
    try {
      set({ isLoading: true, error: null });
      const updatedVideo = await apiService.updateVideo(id, video);
      if (updatedVideo) {
        set((state) => ({
          videos: state.videos.map(v => v.id === id ? updatedVideo : v),
          todayVideos: state.todayVideos.map(v => v.id === id ? updatedVideo : v),
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      return updatedVideo;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update video', 
        isLoading: false 
      });
      return null;
    }
  },
  
  deleteVideo: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const success = await apiService.deleteVideo(id);
      if (success) {
        set((state) => ({
          videos: state.videos.filter(v => v.id !== id),
          todayVideos: state.todayVideos.filter(v => v.id !== id),
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      return success;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete video', 
        isLoading: false 
      });
      return false;
    }
  },
  
  markVideoAsUploaded: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const updatedVideo = await apiService.markVideoAsUploaded(id);
      if (updatedVideo) {
        set((state) => ({
          videos: state.videos.map(v => v.id === id ? updatedVideo : v),
          todayVideos: state.todayVideos.map(v => v.id === id ? updatedVideo : v),
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      return updatedVideo;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark video as uploaded', 
        isLoading: false 
      });
      return null;
    }
  },
  
  revertVideoUpload: async (id) => {
    try {
      set({ isLoading: true, error: null });
      const updatedVideo = await apiService.revertVideoUpload(id);
      if (updatedVideo) {
        set((state) => ({
          videos: state.videos.map(v => v.id === id ? updatedVideo : v),
          todayVideos: state.todayVideos.map(v => v.id === id ? updatedVideo : v),
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
      return updatedVideo;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to revert video upload', 
        isLoading: false 
      });
      return null;
    }
  },
  
  openVideoInPlayer: async (id) => {
    try {
      return await apiService.openVideoFile(id);
    } catch (error) {
      console.error('Failed to open video in player:', error);
      return false;
    }
  },
  
  // File operations
  importVideoFromDevice: async (videoInfo) => {
    try {
      set({ isLoading: true, error: null });
      
      // No need to upload file - just create a reference to it
      // This is the major difference in offline mode
      const video = await apiService.createVideoWithMetadata(videoInfo);
      
      // Update state
      set((state) => ({
        videos: [...state.videos, video],
        isLoading: false
      }));
      
      return video;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to import video', 
        isLoading: false 
      });
      throw error;
    }
  }
}));
