import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore, Video } from '@/store/useStore';
import VideoCard from '@/components/VideoCard';
import { useToast } from '@/hooks/use-toast';

export default function CompletedSchedule() {
  const { currentProfileId } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch all completed videos
  const { data: videos, isLoading, error, refetch } = useQuery<Video[]>({
    queryKey: ['/api/videos', { status: 'completed' }],
    enabled: !!currentProfileId
  });
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Refreshed',
        description: 'Completed uploads have been updated',
      });
    } catch (err) {
      console.error('Error refreshing completed uploads:', err);
      toast({
        title: 'Error',
        description: 'Could not refresh completed uploads',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Filter videos by current profile
  const filteredVideos = videos?.filter(
    video => video.profileId === currentProfileId && video.status === 'completed'
  ).sort((a, b) => {
    // Sort by uploaded date (newest first)
    const dateA = a.uploadedDate ? new Date(a.uploadedDate) : new Date(0);
    const dateB = b.uploadedDate ? new Date(b.uploadedDate) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  }) || [];
  
  return (
    <div className="schedule-content">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Completed Uploads</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-2 bg-gray-100 rounded-full flex items-center justify-center" 
            disabled={isRefreshing}
            title="Refresh"
          >
            <span className={`material-icons text-sm ${isRefreshing ? 'animate-spin text-yt-blue' : 'text-gray-600'}`}>
              refresh
            </span>
          </button>
          <button className="p-2 bg-gray-100 rounded-full flex items-center justify-center text-gray-600" title="Sort">
            <span className="material-icons text-sm">sort</span>
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="py-8 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-yt-red border-opacity-50 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-500">Loading videos...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <span className="material-icons text-4xl text-gray-300">error</span>
          <p className="mt-2 text-gray-500">Error loading videos</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVideos.length > 0 ? (
            filteredVideos.map(video => (
              <VideoCard 
                key={video.id} 
                video={video}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <span className="material-icons text-4xl text-gray-300">movie</span>
              <p className="mt-2 text-gray-500">No completed uploads</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
