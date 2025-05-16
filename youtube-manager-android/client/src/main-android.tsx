import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { initializeNativeApp } from './lib/offline-app';
import 'tailwindcss/tailwind.css';
import './index.css';

// Components
import AppRoutes from './App';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { ThemeProvider } from './components/ui/theme-provider';
import { Toaster } from './components/ui/toaster';

// Main Android entry point
const AndroidApp: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  
  useEffect(() => {
    // Initialize the native app capabilities
    const setupApp = async () => {
      try {
        // Get device information
        const info = await Device.getInfo();
        setDeviceInfo(info);
        
        // Initialize all native capabilities
        await initializeNativeApp();
        
        // Setup back button handling
        App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        // Show error state instead of loading
        setIsInitialized(true);
      }
    };
    
    setupApp();
    
    // Cleanup listeners
    return () => {
      App.removeAllListeners();
    };
  }, []);
  
  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="ml-3 text-lg">Initializing application...</p>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <AppRoutes />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Mount the app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AndroidApp />
  </React.StrictMode>
);