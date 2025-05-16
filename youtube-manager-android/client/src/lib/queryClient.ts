import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL, CAPACITOR_DEV_URL } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Check if the response is JSON
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        throw new Error(errorData.message || `${res.status}: ${res.statusText}`);
      } else {
        // If not JSON, get the text
        const text = (await res.text()) || res.statusText;
        console.error(`Non-JSON error response (${res.status}):`, text.substring(0, 200));
        throw new Error(`${res.status}: ${res.statusText || 'Server error'}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error; // Re-throw if it's already a properly formatted error
      }
      // Generic fallback
      throw new Error(`${res.status}: ${res.statusText || 'Unknown error'}`);
    }
  }
}

// Check if we're running in a Capacitor environment
function isCapacitor() {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

// Helper function to determine if we should use the production API URL
function isProduction() {
  return import.meta.env.MODE === 'production' || isCapacitor();
}

// Function to get the full API URL
function getFullUrl(url: string): string {
  // If not an API URL, return as is
  if (!url.startsWith('/api')) {
    return url;
  }
  
  // If we're in a Capacitor environment in development
  if (isCapacitor() && import.meta.env.MODE !== 'production') {
    return `${CAPACITOR_DEV_URL}${url}`;
  }
  
  // If we're in production mode and the URL starts with /api, use the production API URL
  if (isProduction()) {
    return `${API_BASE_URL}${url}`;
  }
  
  // Otherwise, use the relative URL (which works in browser development)
  return url;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const fullUrl = getFullUrl(url);
  
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = getFullUrl(queryKey[0] as string);
    try {
      const res = await fetch(url, {
        credentials: "include",
        // Add additional headers for WebView compatibility
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      try {
        return await res.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }
    } catch (error) {
      console.error(`Query error for ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Function to clear specific caches related to profiles and videos
export function clearPushLimitCache() {
  // Clear all profile push counts
  queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
  // Clear all video lists
  queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
  queryClient.invalidateQueries({ queryKey: ['/api/videos/today'] });
  // Since many queries have dynamic IDs, we can use predicate to match patterns
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey[0];
      if (typeof queryKey !== 'string') return false;
      // Match all profile-specific push count queries
      return queryKey.includes('/api/profiles/') && queryKey.includes('/push-count');
    },
  });
}

// Function to clear all query cache
export function clearAllCache() {
  queryClient.clear();
  console.log('All query cache cleared');
}
