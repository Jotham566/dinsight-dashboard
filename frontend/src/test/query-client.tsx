import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

export const createQueryClientWrapper = () => {
  const queryClient = createTestQueryClient();

  const QueryClientTestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  QueryClientTestWrapper.displayName = 'QueryClientTestWrapper';
  return QueryClientTestWrapper;
};
