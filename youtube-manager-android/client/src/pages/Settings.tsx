import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
// Using fetch directly for API calls
import { Loader2, Download, Upload, RefreshCw, Info, Trash2, Upload as UploadIcon } from "lucide-react";

export default function Settings() {
  const { profiles, currentProfileId, setCurrentProfileId, setAddProfileModalOpen, setProfiles } = useStore();
  const { toast } = useToast();
  const { authenticated } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pushLimitData, setPushLimitData] = useState<{ dailyPushCount: number, lastReset: string | null } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanupConfirmation, setShowCleanupConfirmation] = useState(false);
  
  const currentProfile = profiles.find(profile => profile.id === currentProfileId);
  
  // Fetch the user's push limit data
  useEffect(() => {
    if (authenticated) {
      const fetchPushLimitData = async () => {
        try {
          const response = await fetch('/api/user/push-count');
          if (response.ok) {
            const data = await response.json();
            setPushLimitData(data);
          }
        } catch (error) {
          console.error('Error fetching push limit data:', error);
          toast({
            title: 'Error',
            description: 'Could not fetch push limit data',
            variant: 'destructive',
          });
        }
      };
      
      fetchPushLimitData();
    }
  }, [authenticated, toast]);
  
  // Handle reset push limit
  const handleResetPushLimit = async () => {
    if (!showResetConfirmation) {
      setShowResetConfirmation(true);
      return;
    }
    
    setIsResetting(true);
    try {
      const response = await fetch('/api/user/reset-push-count', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Reset failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      setPushLimitData({
        dailyPushCount: data.dailyPushCount,
        lastReset: new Date().toISOString()
      });
      
      toast({
        title: 'Limit Reset',
        description: 'Your daily push limit has been reset',
      });
      
      setShowResetConfirmation(false);
    } catch (error) {
      console.error('Error resetting push limit:', error);
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  // Cancel reset confirmation
  const cancelReset = () => {
    setShowResetConfirmation(false);
  };
  
  // Handle project cleanup
  const handleCleanup = async () => {
    if (!showCleanupConfirmation) {
      setShowCleanupConfirmation(true);
      return;
    }
    
    setIsCleaning(true);
    try {
      const response = await fetch('/api/maintenance/cleanup', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Cleanup failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      
      toast({
        title: 'Cleanup Complete',
        description: result.message,
      });
      
      // Refresh the videos list
      window.location.reload();
      
      setShowCleanupConfirmation(false);
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: 'Cleanup Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsCleaning(false);
    }
  };
  
  // Cancel cleanup confirmation
  const cancelCleanup = () => {
    setShowCleanupConfirmation(false);
  };
  
  // Function to handle data export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Call the export API endpoint
      const response = await fetch('/api/export', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(data, null, 2);
      
      // Create a blob with the data
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a link to download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = `youtube-scheduler-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export successful',
        description: 'Your data has been exported successfully.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Function to handle data import
  const handleImport = async () => {
    try {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      // Create a promise that resolves when a file is selected
      const filePromise = new Promise<File>((resolve, reject) => {
        input.onchange = () => {
          if (input.files && input.files.length > 0) {
            resolve(input.files[0]);
          } else {
            reject(new Error('No file selected'));
          }
        };
      });
      
      // Trigger the file selection dialog
      input.click();
      
      // Wait for file selection
      const file = await filePromise;
      
      // Read the file
      const reader = new FileReader();
      const dataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
      });
      
      reader.readAsText(file);
      const text = await dataPromise;
      
      // Parse the JSON
      const data = JSON.parse(text);
      
      // Validate the data structure
      if (!data.profiles || !Array.isArray(data.profiles) || !data.videos || !Array.isArray(data.videos)) {
        throw new Error('Invalid import file format');
      }
      
      setIsImporting(true);
      
      // Call the import API
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Import failed with status: ${response.status}`);
      }
      
      // Refresh the profiles list
      const profilesResponse = await fetch('/api/profiles');
      if (profilesResponse.ok) {
        const refreshedProfiles = await profilesResponse.json();
        setProfiles(refreshedProfiles);
      }
      
      toast({
        title: 'Import successful',
        description: 'Your data has been imported successfully.',
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  return (
    <div className="settings-page">
      <h1 className="text-xl font-bold mb-4">Settings</h1>
      
      <div className="profile-section bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Profile Management</h2>
        
        <div className="current-profile mb-4">
          <h3 className="text-md font-medium mb-1">Current Profile</h3>
          {currentProfile ? (
            <div className="p-3 bg-gray-50 rounded border">
              <p className="font-semibold">{currentProfile.name}</p>
              <p className="text-sm text-gray-600">{currentProfile.channelName}</p>
              <p className="text-xs text-blue-600 truncate">{currentProfile.channelLink}</p>
            </div>
          ) : (
            <p className="text-gray-500">No profile selected</p>
          )}
        </div>
        
        <div className="profile-selector mb-4">
          <h3 className="text-md font-medium mb-1">Switch Profile</h3>
          <div className="grid gap-2">
            {profiles.length > 0 ? (
              profiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => setCurrentProfileId(profile.id)}
                  className={`text-left p-2 rounded border ${currentProfileId === profile.id
                    ? 'bg-yt-red text-white border-yt-red'
                    : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-xs truncate">{profile.channelName}</div>
                </button>
              ))
            ) : (
              <p className="text-gray-500">No profiles available</p>
            )}
          </div>
        </div>
        
        <button
          onClick={() => setAddProfileModalOpen(true)}
          className="w-full py-2 bg-yt-red text-white rounded-md font-medium hover:bg-yt-red-dark transition-colors"
        >
          Add New Profile
        </button>
      </div>
      
      {/* Push Limit Section */}
      <div className="push-limit-section bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Push to YouTube Limit</h2>
        <p className="text-sm text-gray-600 mb-3">
          Manage your daily limit for pushing videos to YouTube (currently limited to 1 per day).
        </p>
        
        {pushLimitData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-medium">Daily Push Count</h3>
                <p className="text-sm text-gray-600">
                  {pushLimitData.dailyPushCount} of 1 used today
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  pushLimitData.dailyPushCount >= 1 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {pushLimitData.dailyPushCount >= 1 ? 'Limit Reached' : 'Available'}
                </span>
              </div>
            </div>
            
            <Progress value={pushLimitData.dailyPushCount * 100} className="h-2" />
            
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>0</span>
              <span>Daily Limit: 1</span>
            </div>
            
            {pushLimitData.lastReset && (
              <p className="text-xs text-gray-500 mt-2">
                Last reset: {new Date(pushLimitData.lastReset).toLocaleString()}
              </p>
            )}
            
            {showResetConfirmation ? (
              <div className="border border-yellow-200 bg-yellow-50 p-3 rounded-md mt-4">
                <p className="text-sm text-yellow-800 mb-2">
                  <Info className="h-4 w-4 inline mr-1" />
                  Are you sure you want to reset your daily push limit? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleResetPushLimit}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Resetting...
                      </>
                    ) : 'Yes, Reset Limit'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={cancelReset}
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResetPushLimit}
                disabled={pushLimitData.dailyPushCount === 0}
                className="mt-2"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Reset Push Limit
              </Button>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-yt-red" />
          </div>
        )}
      </div>
      
      <div className="data-section bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Data Management</h2>
        <p className="text-sm text-gray-600 mb-3">
          Export your profiles and videos data for backup or import from a previous export.
        </p>
        
        <div className="flex gap-3">
          <Button 
            variant="default" 
            className="flex-1 bg-yt-red hover:bg-yt-red-dark"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="flex-1 border-yt-red text-yt-red hover:bg-red-50"
            onClick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Storage cleanup section */}
      <div className="storage-cleanup bg-white rounded-lg shadow p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Storage Cleanup</h2>
        <p className="text-sm text-gray-600 mb-3">
          Free up space by removing completed videos and other unused files from the server.
        </p>
        
        {showCleanupConfirmation ? (
          <div className="border border-red-200 bg-red-50 p-3 rounded-md">
            <p className="text-sm text-red-800 mb-2">
              <Info className="h-4 w-4 inline mr-1" />
              Warning: This will permanently delete all completed videos and unused files. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleCleanup}
                disabled={isCleaning}
              >
                {isCleaning ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Cleaning...
                  </>
                ) : 'Yes, Delete Everything'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={cancelCleanup}
                disabled={isCleaning}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleCleanup}
            disabled={isCleaning}
            className="flex items-center"
          >
            {isCleaning ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Cleaning Up...
              </>
            ) : (
              <>
                <Trash2 className="mr-1 h-4 w-4" />
                Clean Up Storage
              </>
            )}
          </Button>
        )}
      </div>
        
      <div className="app-info bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-2">About</h2>
        <p className="text-sm text-gray-600 mb-1">YouTube Schedule Manager</p>
        <p className="text-xs text-gray-500">Version 1.0.0</p>
      </div>
    </div>
  );
}
