import { useEffect } from 'react';
import { useStore, Tab } from '@/store/useStore';
import Header from '@/components/Header';
import NavigationTabs from '@/components/NavigationTabs';
import BottomNavigation from '@/components/BottomNavigation';
import TodaySchedule from '@/pages/TodaySchedule';
import PendingSchedule from '@/pages/PendingSchedule';
import CompletedSchedule from '@/pages/CompletedSchedule';
import RemainingSchedule from '@/pages/RemainingSchedule';
import Settings from '@/pages/Settings';
import ProfilesTab from '@/pages/ProfilesTab';
import AddProfileModal from '@/components/AddProfileModal';
import AddVideoModal from '@/components/AddVideoModal';
import PushToYTDialog from '@/components/PushToYTDialog';
import UploadConfirmationDialog from '@/components/UploadConfirmationDialog';
import { useQuery } from '@tanstack/react-query';
import { Profile } from '@/store/useStore';
import { getQueryFn } from '@/lib/queryClient';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Home() {
  const { selectedTab, setProfiles, setCurrentProfileId, currentProfileId } = useStore();
  
  // Fetch profiles
  const { isLoading: isLoadingProfiles, error: profilesError, data: profilesData } = useQuery<Profile[]>({
    queryKey: ['/api/profiles'],
    queryFn: getQueryFn<Profile[]>({ on401: 'returnNull' })
  });
  
  // Process profiles data when it's loaded
  useEffect(() => {
    if (profilesData) {
      setProfiles(profilesData);
      // Set first profile as current if none is selected
      if (profilesData.length > 0 && !currentProfileId) {
        setCurrentProfileId(profilesData[0].id);
      }
    }
  }, [profilesData, currentProfileId, setProfiles, setCurrentProfileId]);
  
  const isMobile = useIsMobile();

  // Render the appropriate content based on the selected tab
  const renderContent = () => {
    switch (selectedTab) {
      case 'today':
        return <TodaySchedule />;
      case 'pending':
        return <PendingSchedule />;
      case 'completed':
        return <CompletedSchedule />;
      case 'remaining':
        return <RemainingSchedule />;
      case 'settings':
        return <Settings />;
      case 'profiles':
        return <ProfilesTab />;
      default:
        return <TodaySchedule />;
    }
  };
  
  return (
    <div className="app-container pb-16">
      <Header>
        <NavigationTabs />
      </Header>
      
      <main className="container mx-auto px-4 py-4">
        {renderContent()}
      </main>
      
      <BottomNavigation />
      
      {/* Modals */}
      <AddProfileModal />
      <AddVideoModal />
      <PushToYTDialog />
      <UploadConfirmationDialog />
    </div>
  );
}
