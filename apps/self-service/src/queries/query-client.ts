import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes cache to prevent aggressive unmount refetching
      gcTime: 30 * 60 * 1000, // 30 minutes memory retaining
      retry: 1,
      refetchOnWindowFocus: false, // Prevent annoying network spinners when focusing page
    },
  },
});
