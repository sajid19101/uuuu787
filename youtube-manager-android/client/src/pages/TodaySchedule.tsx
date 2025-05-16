import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useStore, Video } from '@/store/useStore';
import VideoCard from '@/components/VideoCard';
import { getTodayDisplayDate, getTimeSince, isMissedSchedule } from '@/utils/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditVideoModal } from '@/components/EditVideoModal';
import { clearAllCache, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUp, Calendar } from 'lucide-react';

// Define the valid status types including missed-schedule
// The status field in videos schema has values: pending, completed, missed-schedule
type VideoStatus = 'pending' | 'completed' | 'missed-schedule';

export default function TodaySchedule() {
  const { setAddVideoModalOpen, currentProfileId, profiles, setEditVideoModalOpen, isEditVideoModalOpen, selectedVideoId } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUploadedDate, setLastUploadedDate] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch today's videos
  const { data: todayVideos, isLoading, error, refetch } = useQuery<Video[]>({
    queryKey: ['/api/videos/today'],
    enabled: !!currentProfileId
  });
  
  // Fetch all videos to find missed ones and the most recent upload
  const { data: allVideos } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
    enabled: !!currentProfileId
  });
  
  // Filter videos by current profile and status
  const pendingVideos = todayVideos?.filter(
    video => video.profileId === currentProfileId && video.status === 'pending'
  ) || [];
  
  // Get all completed videos (not just from today)
  const completedVideos = allVideos?.filter(
    video => video.profileId === currentProfileId && video.status === 'completed'
  ) || [];
  
  // Find videos that have missed their scheduled date
  const missedVideos = allVideos?.filter(
    video => 
      video.profileId === currentProfileId && 
      // Comparing string values directly
      video.status === 'missed-schedule'
  ) || [];
  
  // Move type declaration up here
  
  // Tab state management
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'missed'>('pending');
  
  // Calculate the most recent upload for the current profile
  useEffect(() => {
    if (!allVideos || !currentProfileId) return;
    
    const completedProfileVideos = allVideos.filter(
      video => video.profileId === currentProfileId && 
              video.status === 'completed' && 
              video.uploadedDate
    );
    
    if (completedProfileVideos.length === 0) {
      setLastUploadedDate(null);
      return;
    }
    
    // Find the most recent uploaded video
    const sortedVideos = [...completedProfileVideos].sort((a, b) => 
      new Date(b.uploadedDate!).getTime() - new Date(a.uploadedDate!).getTime()
    );
    
    setLastUploadedDate(sortedVideos[0].uploadedDate);
  }, [allVideos, currentProfileId]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear the entire query cache
      clearAllCache();
      await refetch();
      toast({
        title: 'Refreshed',
        description: 'Today\'s schedule has been updated',
      });
    } catch (err) {
      console.error('Error refreshing today\'s schedule:', err);
      toast({
        title: 'Error',
        description: 'Could not refresh today\'s schedule',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Reschedule all missed videos mutation
  const rescheduleAllMutation = useMutation({
    mutationFn: async () => {
      if (!currentProfileId) throw new Error("No profile selected");
      const res = await apiRequest('POST', `/api/profiles/${currentProfileId}/reschedule-missed`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Rescheduled Videos",
        description: `${data.rescheduledCount} videos have been rescheduled to upcoming days`,
      });
      // Invalidate relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/today'] });
    },
    onError: (error: any) => {
      console.error('Error rescheduling videos:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule missed videos",
        variant: "destructive",
      });
    }
  });

  // Handle reschedule all missed videos
  const handleRescheduleAll = () => {
    if (!missedVideos.length) {
      toast({
        title: "No Missed Videos",
        description: "There are no missed videos to reschedule",
      });
      return;
    }
    
    rescheduleAllMutation.mutate();
  };
  
  // Handle edit video
  const handleEditVideo = (videoId: number) => {
    setEditVideoModalOpen(true, videoId);
  };
  
  // Function to delete all completed videos
  const handleDeleteAllCompleted = async () => {
    // Confirmation before deleting
    if (!window.confirm(`Are you sure you want to delete all ${completedVideos.length} completed videos? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await apiRequest('DELETE', '/api/videos/status/completed');
      
      if (!response.ok) {
        throw new Error('Failed to delete completed videos');
      }
      
      const result = await response.json();
      
      // Invalidate video queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videos/today'] });
      
      toast({
        title: 'Success',
        description: `${result.deletedCount} completed videos have been deleted from the server.`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error deleting completed videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete completed videos. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
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
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Today's Schedule</h2>
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
              <span className="text-sm text-gray-500">{getTodayDisplayDate()}</span>
            </div>
          </div>
          
          {/* Profile last upload info */}
          {currentProfileId && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <span className="material-icons text-xs mr-1">upload</span>
              <span>
                Last pushed: {getTimeSince(lastUploadedDate)}
              </span>
            </div>
          )}
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
          <Tabs defaultValue="pending" className="w-full" onValueChange={(value) => setActiveTab(value as 'pending' | 'completed' | 'missed')}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="flex items-center justify-center">
                  <span className="material-icons text-sm mr-1 text-amber-500">hourglass_empty</span>
                  Pending
                  {pendingVideos.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                      {pendingVideos.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="missed" className="flex items-center justify-center">
                  <span className="material-icons text-sm mr-1 text-red-500">warning</span>
                  Missed
                  {missedVideos.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      {missedVideos.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center justify-center">
                  <span className="material-icons text-sm mr-1 text-green-500">check_circle</span>
                  Completed
                  {completedVideos.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {completedVideos.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="pending" className="space-y-4 mt-2">
              
              {/* Today's pending videos */}
              <h3 className="text-sm font-medium flex items-center mb-2">
                <span className="material-icons text-amber-500 mr-1">today</span>
                Today's Videos
              </h3>
              
              {pendingVideos.length > 0 ? (
                pendingVideos.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    isPushable={true}
                    onEdit={handleEditVideo}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <span className="material-icons text-4xl text-gray-300">hourglass_empty</span>
                  <p className="mt-2 text-gray-500">No pending videos scheduled for today</p>
                  <button 
                    onClick={() => setAddVideoModalOpen(true)}
                    className="mt-4 bg-yt-blue text-white px-4 py-2 rounded-full text-sm"
                  >
                    Schedule a Video Now
                  </button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="missed" className="space-y-4 mt-2">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <span className="material-icons text-red-500 mr-1">warning</span>
                Missed Uploads
              </h3>
              
              {missedVideos.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-gray-500">
                      The following videos have missed their scheduled upload dates.
                    </p>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={handleRescheduleAll}
                      disabled={rescheduleAllMutation.isPending}
                    >
                      {rescheduleAllMutation.isPending ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Rescheduling...</>
                      ) : (
                        <><Calendar className="h-3 w-3" /> Reschedule All</>
                      )}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {missedVideos.map(video => (
                      <VideoCard 
                        key={video.id} 
                        video={video} 
                        isPushable={false}
                        onEdit={handleEditVideo}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-icons text-4xl text-gray-300">event_available</span>
                  <p className="mt-2 text-gray-500">No missed schedule videos</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4 mt-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium flex items-center">
                  <span className="material-icons text-green-500 mr-1">check_circle</span>
                  All Completed Videos
                </h3>
                
                {completedVideos.length > 0 && (
                  <button
                    onClick={handleDeleteAllCompleted}
                    disabled={isDeleting}
                    className="flex items-center text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                    title="Delete all completed videos from server"
                  >
                    {isDeleting ? (
                      <>
                        <span className="material-icons text-xs mr-1 animate-spin">autorenew</span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <span className="material-icons text-xs mr-1">delete</span>
                        Clear All ({completedVideos.length})
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {completedVideos.length > 0 ? (
                completedVideos.map(video => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    isPushable={false}
                    onEdit={handleEditVideo}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <span className="material-icons text-4xl text-gray-300">check_circle</span>
                  <p className="mt-2 text-gray-500">No completed videos</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      {renderEditModal()}
    </div>
  );
}