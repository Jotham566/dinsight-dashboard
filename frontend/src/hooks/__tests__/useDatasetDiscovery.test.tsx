import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDatasetDiscovery } from '@/hooks/useDatasetDiscovery';
import { api } from '@/lib/api-client';
import { createQueryClientWrapper } from '@/test/query-client';

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual('@/lib/api-client');
  return {
    ...actual,
    api: {
      ...((actual as any).api ?? {}),
      analysis: {
        ...((actual as any).api?.analysis ?? {}),
        getDinsight: vi.fn(),
      },
    },
  };
});

describe('useDatasetDiscovery', () => {
  it('discovers and sorts valid datasets', async () => {
    const mocked = vi.mocked(api.analysis.getDinsight);

    mocked.mockImplementation(async (id: number) => {
      if (id === 1 || id === 3) {
        return {
          data: {
            success: true,
            data: {
              dinsight_id: id,
              dinsight_x: [1],
              dinsight_y: [2],
            },
          },
        } as any;
      }

      throw new Error('not found');
    });

    const { result } = renderHook(
      () => useDatasetDiscovery({ maxId: 5, maxConsecutiveMisses: 2, refetchInterval: 0 }),
      {
        wrapper: createQueryClientWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.datasetIds).toEqual([1, 3]);
    expect(result.current.latestDatasetId).toBe(3);
  });
});
