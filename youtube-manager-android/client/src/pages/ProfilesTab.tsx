import { useState, useEffect } from 'react';
import { useStore, Profile, Video } from '@/store/useStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, clearPushLimitCache } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getTimeSince } from '@/utils/dateUtils';
import { EditProfileModal } from '@/components/EditProfileModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { TruncatedText } from '@/components/TruncatedText';

export default function ProfilesTab() {
  const { 
    profiles, 
    currentProfileId, 
    setCurrentProfileId, 
    setAddProfileModalOpen,
    isEditProfileModalOpen,
    selectedProfileId,
    setEditProfileModalOpen
  } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [profileLastUploads, setProfileLastUploads] = useState<Record<number, string | null>>({});
  const [profilePendingCounts, setProfilePendingCounts] = useState<Record<number, number>>({});

  // Fetch profiles
  const { isLoading, error, data: profilesData, refetch } = useQuery<Profile[]>({
    queryKey: ['/api/profiles'],
  });

  // Fetch all videos to determine last upload dates
  const { data: videosData } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  // Calculate the most recent upload for each profile and pending video counts
  useEffect(() => {
    if (!videosData) return;
    
    const completedVideos = videosData.filter(video => video.status === 'completed' && video.uploadedDate);
    const pendingVideos = videosData.filter(video => video.status === 'pending');
    const lastUploads: Record<number, string | null> = {};
    const pendingCounts: Record<number, number> = {};
    
    // For each profile, find the most recent uploaded video and count pending videos
    profiles.forEach(profile => {
      // Process completed videos for last upload date
      const profileCompletedVideos = completedVideos.filter(video => video.profileId === profile.id);
      
      if (profileCompletedVideos.length === 0) {
        lastUploads[profile.id] = null;
      } else {
        // Find the most recent uploaded video for this profile
        const sortedVideos = [...profileCompletedVideos].sort((a, b) => 
          new Date(b.uploadedDate!).getTime() - new Date(a.uploadedDate!).getTime()
        );
        
        lastUploads[profile.id] = sortedVideos[0].uploadedDate;
      }
      
      // Count pending videos for this profile
      const profilePendingVideos = pendingVideos.filter(video => video.profileId === profile.id);
      pendingCounts[profile.id] = profilePendingVideos.length;
    });
    
    setProfileLastUploads(lastUploads);
    setProfilePendingCounts(pendingCounts);
  }, [videosData, profiles]);

  // Update filtered profiles when search query changes or profiles change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProfiles(profiles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = profiles.filter(profile => 
        profile.name.toLowerCase().includes(query) || 
        profile.channelName.toLowerCase().includes(query) ||
        profile.channelLink.toLowerCase().includes(query)
      );
      setFilteredProfiles(filtered);
    }
  }, [searchQuery, profiles]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Refreshed',
        description: 'Profiles list has been updated',
      });
    } catch (err) {
      console.error('Error refreshing profiles:', err);
      toast({
        title: 'Error',
        description: 'Could not refresh profiles list',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteProfile = async (id: number) => {
    if (confirm('Are you sure you want to delete this profile? This cannot be undone.')) {
      try {
        await apiRequest('DELETE', `/api/profiles/${id}`);
        
        queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
        
        toast({
          title: 'Profile Deleted',
          description: 'The profile has been removed',
        });
      } catch (error) {
        console.error('Error deleting profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete the profile',
          variant: 'destructive',
        });
      }
    }
  };

  const selectProfile = (id: number) => {
    setCurrentProfileId(id);
    toast({
      title: 'Profile Selected',
      description: `Now using ${profiles.find(p => p.id === id)?.name}`,
    });
  };
  
  const resetProfilePushCount = async (id: number) => {
    try {
      await apiRequest('POST', `/api/profiles/${id}/reset-push-count`);
      
      // Use our enhanced cache clearing function
      clearPushLimitCache();
      
      toast({
        title: 'Push Limit Reset',
        description: 'This profile can now push videos to YouTube again',
      });
    } catch (err) {
      console.error('Error resetting profile push count:', err);
      toast({
        title: 'Error',
        description: 'Could not reset push limit',
        variant: 'destructive',
      });
    }
  };

  // Use the filtered profiles for rendering
  const displayedProfiles = filteredProfiles.length > 0 || searchQuery.trim() ? filteredProfiles : profiles;

  const handleCloseEditProfileModal = () => {
    setEditProfileModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-xl font-bold">Profiles</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="p-2 bg-gray-100 rounded-full"
            disabled={isRefreshing}
            aria-label="Refresh profiles"
          >
            <span className={`material-icons ${isRefreshing ? 'animate-spin text-yt-blue' : ''}`}>
              refresh
            </span>
          </button>
          <button
            onClick={() => setAddProfileModalOpen(true)}
            className="flex items-center bg-yt-red text-white px-3 sm:px-4 py-2 rounded-md shadow-sm text-sm sm:text-base"
          >
            <span className="material-icons mr-1 text-sm sm:text-base">add</span>
            {isMobile ? 'Add' : 'New Profile'}
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <span className="material-icons text-gray-400">search</span>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-yt-red focus:border-yt-red block w-full pl-10 p-2.5"
          placeholder="Search profiles..."
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <span className="material-icons text-gray-400">close</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yt-red"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>Error loading profiles</p>
          <button 
            onClick={handleRefresh}
            className="mt-2 px-4 py-2 bg-gray-100 rounded-md"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {profiles.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No profiles yet. Create your first profile!</p>
              <button
                onClick={() => setAddProfileModalOpen(true)}
                className="mt-4 px-6 py-2 bg-yt-red text-white rounded-md shadow-sm"
              >
                Add Profile
              </button>
            </div>
          ) : searchQuery && displayedProfiles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No profiles match your search</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-4 py-2 bg-gray-100 rounded-md"
              >
                Clear Search
              </button>
            </div>
          ) : (
            displayedProfiles.map((profile) => (
              <div 
                key={profile.id} 
                className={`p-3 sm:p-4 rounded-lg shadow-sm border ${currentProfileId === profile.id ? 'border-yt-red bg-red-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Profile Info */}
                  <div className="flex items-start flex-1">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0D8ABC&color=fff&size=64`} 
                      alt={profile.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <h2 className="font-semibold text-base sm:text-lg">
                        <TruncatedText 
                          text={profile.name} 
                          maxLength={20} 
                          className="font-semibold" 
                        />
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-600">
                        <TruncatedText 
                          text={profile.channelName} 
                          maxLength={25} 
                        />
                      </p>
                      {profile.channelLink && (
                        <a 
                          href={profile.channelLink} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-yt-blue hover:underline flex items-center mt-1"
                        >
                          <span className="material-icons text-xs mr-1">link</span>
                          View Channel
                        </a>
                      )}
                      
                      {/* Stats in a flex row for better mobile layout */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {/* Last pushed to YouTube info */}
                        <div className="text-xs text-gray-500 flex items-center">
                          <span className="material-icons text-xs mr-1 flex-shrink-0">upload</span>
                          <span className="truncate">Last: {getTimeSince(profileLastUploads[profile.id] || null)}</span>
                        </div>
                        
                        {/* Videos remaining count */}
                        <div className="text-xs text-gray-500 flex items-center">
                          <span className="material-icons text-xs mr-1 flex-shrink-0">video_library</span>
                          <span>Videos: {profilePendingCounts[profile.id] || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons - stacked on mobile, horizontal on larger screens */}
                  <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 justify-end">
                    {currentProfileId !== profile.id && (
                      <button
                        onClick={() => selectProfile(profile.id)}
                        className="py-1.5 px-3 text-yt-blue bg-blue-50 hover:bg-blue-100 rounded-md text-xs sm:text-sm flex items-center"
                      >
                        <span className="material-icons text-xs sm:text-sm mr-1">check_circle</span>
                        Select
                      </button>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setEditProfileModalOpen(true, profile.id)}
                        className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 rounded-md text-xs sm:text-sm flex items-center"
                        title="Edit profile"
                      >
                        <span className="material-icons text-xs sm:text-sm mr-1">edit</span>
                        {isMobile ? "" : "Edit"}
                      </button>
                      
                      <button
                        onClick={() => resetProfilePushCount(profile.id)}
                        className="py-1.5 px-3 bg-green-50 hover:bg-green-100 text-green-600 rounded-md text-xs sm:text-sm flex items-center"
                        title="Reset push limit for this profile"
                      >
                        <span className="material-icons text-xs sm:text-sm mr-1">refresh</span>
                        {isMobile ? "" : "Reset Limit"}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProfile(profile.id)}
                        className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-md text-xs sm:text-sm flex items-center"
                        disabled={profiles.length === 1}
                        title={profiles.length === 1 ? "Cannot delete the only profile" : "Delete profile"}
                      >
                        <span className="material-icons text-xs sm:text-sm mr-1">delete</span>
                        {isMobile ? "" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Current profile indicator */}
                {currentProfileId === profile.id && (
                  <div className="mt-2 pt-2 border-t border-red-200">
                    <p className="text-xs text-yt-red flex items-center">
                      <span className="material-icons text-xs mr-1">check</span>
                      Current active profile
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && selectedProfileId && (
        <EditProfileModal 
          profileId={selectedProfileId}
          onClose={handleCloseEditProfileModal}
        />
      )}
    </div>
  );
}