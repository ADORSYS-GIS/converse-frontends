import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000, // 10 seconds cache gives UI stability without obscuring real-time logs
      gcTime: 10 * 60 * 1000, 
      retry: 1,
      refetchOnWindowFocus: true, // Crucial for external API actions
      refetchOnMount: true,
    },
  },
});
