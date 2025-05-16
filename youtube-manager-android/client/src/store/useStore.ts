import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/queryClient';

export interface Profile {
  id: number;
  name: string;
  channelName: string;
  channelLink: string;
}

export interface Video {
  id: number;
  profileId: number;
  title: string;
  description: string | null;
  filePath: string;
  fileName: string;
  fileSize?: number | null;
  originalFilePath?: string | null;
  originalFileSize?: number | null;
  thumbnailPath: string | null;
  duration: string | null;
  scheduleDate: string;
  status: 'pending' | 'completed';
  uploadedDate: string | null;
  youtubeLink: string | null;
}

export type Tab = 'today' | 'pending' | 'completed' | 'settings' | 'profiles' | 'remaining';

type VideoFile = {
  file: File;
  thumbnailUrl: string;
  duration?: string;
};

interface AppState {
  // Profile state
  profiles: Profile[];
  currentProfileId: number | null;
  isAddProfileModalOpen: boolean;
  isAddVideoModalOpen: boolean;
  isPushToYTDialogOpen: boolean;
  isUploadConfirmDialogOpen: boolean;
  isEditVideoModalOpen: boolean;
  isEditProfileModalOpen: boolean;
  selectedVideoId: number | null;
  selectedProfileId: number | null;
  selectedTab: Tab;
  selectedVideoFiles: VideoFile[];
  // Legacy support for single file selection
  selectedVideoFile: VideoFile | null;
  
  // Actions
  setProfiles: (profiles: Profile[]) => void;
  setCurrentProfileId: (id: number | null) => void;
  addProfile: (profile: Omit<Profile, 'id'>) => Promise<Profile>;
  updateProfile: (id: number, profile: Partial<Profile>) => Promise<Profile>;
  deleteProfile: (id: number) => Promise<boolean>;
  
  // Modal state actions
  setAddProfileModalOpen: (isOpen: boolean) => void;
  setAddVideoModalOpen: (isOpen: boolean) => void;
  setPushToYTDialogOpen: (isOpen: boolean, videoId?: number) => void;
  setUploadConfirmDialogOpen: (isOpen: boolean, videoId?: number) => void;
  setEditVideoModalOpen: (isOpen: boolean, videoId?: number) => void;
  setEditProfileModalOpen: (isOpen: boolean, profileId?: number) => void;
  
  // Tab actions
  setSelectedTab: (tab: Tab) => void;
  
  // File handling
  setSelectedVideoFile: (videoFile: VideoFile | null) => void;
  setSelectedVideoFiles: (videoFiles: VideoFile[]) => void;
  addSelectedVideoFiles: (videoFiles: VideoFile[]) => void;
  clearSelectedVideoFiles: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      profiles: [],
      currentProfileId: null,
      isAddProfileModalOpen: false,
      isAddVideoModalOpen: false,
      isPushToYTDialogOpen: false,
      isUploadConfirmDialogOpen: false,
      isEditVideoModalOpen: false,
      isEditProfileModalOpen: false,
      selectedVideoId: null,
      selectedProfileId: null,
      selectedTab: 'today',
      selectedVideoFile: null,
      selectedVideoFiles: [],
      
      // Profile actions
      setProfiles: (profiles) => set({ profiles }),
      setCurrentProfileId: (id) => set({ currentProfileId: id }),
      
      addProfile: async (profile) => {
        try {
          const response = await apiRequest('POST', '/api/profiles', profile);
          const newProfile = await response.json();
          set((state) => ({
            profiles: [...state.profiles, newProfile],
            currentProfileId: state.currentProfileId || newProfile.id
          }));
          return newProfile;
        } catch (error) {
          console.error('Failed to add profile:', error);
          throw error;
        }
      },
      
      updateProfile: async (id, profile) => {
        try {
          const response = await apiRequest('PUT', `/api/profiles/${id}`, profile);
          const updatedProfile = await response.json();
          set((state) => ({
            profiles: state.profiles.map((p) => (p.id === id ? updatedProfile : p))
          }));
          return updatedProfile;
        } catch (error) {
          console.error('Failed to update profile:', error);
          throw error;
        }
      },
      
      deleteProfile: async (id) => {
        try {
          await apiRequest('DELETE', `/api/profiles/${id}`);
          set((state) => ({
            profiles: state.profiles.filter((p) => p.id !== id),
            currentProfileId: state.currentProfileId === id ? 
              (state.profiles.length > 1 ? 
                state.profiles.find(p => p.id !== id)?.id || null : null) 
              : state.currentProfileId
          }));
          return true;
        } catch (error) {
          console.error('Failed to delete profile:', error);
          return false;
        }
      },
      
      // Modal state actions
      setAddProfileModalOpen: (isOpen) => set({ isAddProfileModalOpen: isOpen }),
      setAddVideoModalOpen: (isOpen) => set({ isAddVideoModalOpen: isOpen }),
      
      setPushToYTDialogOpen: (isOpen, videoId) => set({ 
        isPushToYTDialogOpen: isOpen,
        selectedVideoId: videoId !== undefined ? videoId : get().selectedVideoId
      }),
      
      setUploadConfirmDialogOpen: (isOpen, videoId) => set({
        isUploadConfirmDialogOpen: isOpen,
        selectedVideoId: videoId !== undefined ? videoId : get().selectedVideoId
      }),
      
      setEditVideoModalOpen: (isOpen, videoId) => set({
        isEditVideoModalOpen: isOpen,
        selectedVideoId: videoId !== undefined ? videoId : get().selectedVideoId
      }),
      
      setEditProfileModalOpen: (isOpen, profileId) => set({
        isEditProfileModalOpen: isOpen,
        selectedProfileId: profileId !== undefined ? profileId : get().selectedProfileId
      }),
      
      // Tab actions
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      
      // File handling
      setSelectedVideoFile: (videoFile) => set({ selectedVideoFile: videoFile }),
      
      // Multiple file selection methods
      setSelectedVideoFiles: (videoFiles) => set({ selectedVideoFiles: videoFiles }),
      
      addSelectedVideoFiles: (videoFiles) => set((state) => ({ 
        selectedVideoFiles: [...state.selectedVideoFiles, ...videoFiles] 
      })),
      
      clearSelectedVideoFiles: () => set({ selectedVideoFiles: [] }),
    }),
    {
      name: 'yt-scheduler-storage',
      partialize: (state) => ({
        profiles: state.profiles,
        currentProfileId: state.currentProfileId,
      }),
    }
  )
);
