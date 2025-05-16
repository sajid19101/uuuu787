import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStore, Video } from '@/store/useStore';
import VideoCard from '@/components/VideoCard';
import { useToast } from '@/hooks/use-toast';
import { EditVideoModal } from '@/components/EditVideoModal';

export default function PendingSchedule() {
  const { setAddVideoModalOpen, currentProfileId, setEditVideoModalOpen, isEditVideoModalOpen, selectedVideoId } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch all pending videos
  const { data: videos, isLoading, error, refetch } = useQuery<Video[]>({
    queryKey: ['/api/videos', { status: 'pending' }],
    enabled: !!currentProfileId
  });
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: 'Refreshed',
        description: 'Pending schedule has been updated',
      });
    } catch (err) {
      console.error('Error refreshing pending schedule:', err);
      toast({
        title: 'Error',
        description: 'Could not refresh pending schedule',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Filter videos by current profile and exclude today's videos
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const filteredVideos = videos?.filter(video => {
    const videoDate = new Date(video.scheduleDate);
    videoDate.setHours(0, 0, 0, 0);
    
    return video.profileId === currentProfileId && 
           video.status === 'pending' && 
           videoDate > today;
  }).sort((a, b) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime()) || [];
  
  // Handle edit video
  const handleEditVideo = (videoId: number) => {
    setEditVideoModalOpen(true, videoId);
  };
  
  const renderEditModal = () => {
    if (isEditVideoModalOpen) {
      return (
        <EditVideoModal
          videoId={selectedVideoId}
          onClose={() => setEditVideoModalOpen(false)}
        />
      );
    }
    return null;
  };

  return (
    <div className="relative">
      <div className="schedule-content">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Pending Schedule</h2>
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
            <button className="p-2 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <span className="material-icons text-sm">sort</span>
            </button>
            <button className="p-2 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <span className="material-icons text-sm">filter_list</span>
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
                  onEdit={handleEditVideo}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <span className="material-icons text-4xl text-gray-300">movie</span>
                <p className="mt-2 text-gray-500">No pending videos</p>
                <button 
                  onClick={() => setAddVideoModalOpen(true)}
                  className="mt-4 bg-yt-blue text-white px-4 py-2 rounded-full text-sm"
                >
                  Schedule a Video
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {renderEditModal()}
    </div>
  );
}
