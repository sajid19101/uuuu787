import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VideoCard } from '@/components/VideoCard';
import { useStore, Video } from '@/store/useStore';
import { getQueryFn } from '@/lib/queryClient';
import { formatScheduleDateTime, getTimeSince } from '@/utils/dateUtils';

interface ProfileVideoCount {
  profileId: number;
  profileName: string;
  count: number;
  videos: Video[];
  lastUploadedDate: string | null;
}

export default function RemainingSchedule() {
  const { profiles, setSelectedTab, setCurrentProfileId } = useStore();
  const [profileVideoCounts, setProfileVideoCounts] = useState<ProfileVideoCount[]>([]);
  
  // Fetch all pending videos
  const { data: videosData, isLoading, error } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
    queryFn: getQueryFn<Video[]>({ on401: 'returnNull' })
  });
  
  // Process video data to count remaining videos per profile
  useEffect(() => {
    if (!videosData || !profiles) return;
    
    const pendingVideos = videosData.filter(video => video.status === 'pending');
    const completedVideos = videosData.filter(video => video.status === 'completed');
    const profileCounts: Record<number, ProfileVideoCount> = {};
    
    // Initialize profile counts with all profiles that have pending videos
    pendingVideos.forEach(video => {
      const profileId = video.profileId;
      const profile = profiles.find(p => p.id === profileId);
      
      if (!profileCounts[profileId]) {
        profileCounts[profileId] = {
          profileId,
          profileName: profile?.name || `Profile ${profileId}`,
          count: 0,
          videos: [],
          lastUploadedDate: null // Initialize with no last upload
        };
      }
      
      profileCounts[profileId].count += 1;
      profileCounts[profileId].videos.push(video);
    });
    
    // Find the most recent completed video for each profile to determine last upload
    completedVideos.forEach(video => {
      const profileId = video.profileId;
      
      // Skip if profile doesn't have any pending videos (we only want to show profiles with pending videos)
      if (!profileCounts[profileId]) return;
      
      // Only process videos that have an uploadedDate
      if (!video.uploadedDate) return;
      
      const uploadDate = new Date(video.uploadedDate);
      const currentLastUpload = profileCounts[profileId].lastUploadedDate;
      
      // Update if this is the first upload found or if it's more recent than current last
      if (!currentLastUpload || uploadDate > new Date(currentLastUpload)) {
        profileCounts[profileId].lastUploadedDate = video.uploadedDate;
      }
    });
    
    // Convert to array and sort by count (lowest to highest)
    const sortedProfileCounts = Object.values(profileCounts).sort((a, b) => a.count - b.count);
    setProfileVideoCounts(sortedProfileCounts);
  }, [videosData, profiles]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yt-red"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-500">Error loading videos. Please try again.</p>
      </div>
    );
  }
  
  if (profileVideoCounts.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No remaining videos scheduled.</p>
      </div>
    );
  }
  
  const handleEditVideo = (videoId: number) => {
    // Hook into video editing functionality
  };
  
  return (
    <div>
      {/* Header with explanation */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center mb-2">
          <span className="material-icons text-yt-red mr-2">inventory</span>
          <h1 className="font-bold text-xl">Remaining Videos</h1>
        </div>
        <p className="text-gray-600 text-sm">
          Profiles are sorted from lowest to highest count. 
          <span className="inline-flex items-center ml-1 text-amber-600 font-medium">
            <span className="material-icons text-sm mr-1">warning</span>
            Warning shown for profiles with fewer than 4 videos.
          </span>
        </p>
      </div>

      {profileVideoCounts.map(({ profileId, profileName, count, videos, lastUploadedDate }) => {
        const isLowCount = count < 4; // Videos less than 4 will show warning
        const profile = profiles.find(p => p.id === profileId);
        const channelName = profile?.channelName || '';
        
        // Get the next scheduled video date
        const nextScheduledVideo = [...videos].sort((a, b) => 
          new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime()
        )[0];
        
        return (
          <div key={profileId} className="mb-8 border rounded-lg overflow-hidden">
            {/* Profile header with complete info and status */}
            <div className={`p-4 ${isLowCount ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="material-icons text-gray-500">account_circle</span>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{profileName}</h2>
                    <div className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-amber-700">
                      Low ({count})
                    </div>
                  </div>
                  {channelName && <p className="text-sm text-gray-600">@{channelName}</p>}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-3">
                {/* Channel link */}
                {profile?.channelLink && (
                  <a
                    href={profile.channelLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white border border-gray-200 px-2 py-1 rounded flex items-center text-blue-600 hover:bg-blue-50"
                  >
                    <span className="material-icons text-xs mr-1">open_in_new</span>
                    Channel
                  </a>
                )}
                
                {/* Video status indicator */}
                {isLowCount && (
                  <div className="text-xs px-2 py-1 rounded flex items-center bg-amber-100 text-amber-900">
                    <span className="material-icons text-xs mr-1">warning</span>
                    Low video count
                  </div>
                )}
                
                {/* Next scheduled date */}
                {nextScheduledVideo && (
                  <div className="text-xs bg-white border border-gray-200 px-2 py-1 rounded flex items-center">
                    <span className="material-icons text-xs mr-1 text-gray-500">event</span>
                    Next: {formatScheduleDateTime(nextScheduledVideo.scheduleDate)}
                  </div>
                )}
                
                {/* Last pushed to YouTube */}
                <div className="text-xs bg-white border border-gray-200 px-2 py-1 rounded flex items-center">
                  <span className="material-icons text-xs mr-1 text-gray-500">upload</span>
                  Last pushed: {getTimeSince(lastUploadedDate)}
                </div>
                
                {/* Videos remaining count */}
                <div className="text-xs bg-white border border-gray-200 px-2 py-1 rounded flex items-center">
                  <span className="material-icons text-xs mr-1 text-gray-500">video_library</span>
                  Videos remaining: {count}
                </div>
              </div>
            </div>
            
            {/* Action button section */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    // Update both selected tab and filtered profile
                    setSelectedTab('pending');
                    setCurrentProfileId(profileId);
                  }}
                  className="px-4 py-1.5 bg-yt-blue hover:bg-blue-700 text-white rounded flex items-center text-xs font-medium"
                >
                  <span className="material-icons text-xs mr-1">visibility</span>
                  View Schedule
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
