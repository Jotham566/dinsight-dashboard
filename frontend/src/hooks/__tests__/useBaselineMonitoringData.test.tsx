import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBaselineMonitoringData } from '@/hooks/useBaselineMonitoringData';
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
      monitoring: {
        ...((actual as any).api?.monitoring ?? {}),
        get: vi.fn(),
        getCoordinates: vi.fn(),
      },
    },
  };
});

describe('useBaselineMonitoringData', () => {
  it('loads baseline and monitoring rows', async () => {
    vi.mocked(api.analysis.getDinsight).mockResolvedValue({
      data: {
        success: true,
        data: {
          dinsight_x: [1, 2],
          dinsight_y: [3, 4],
          point_metadata: [{ tag: 'b1' }, { tag: 'b2' }],
        },
      },
    } as any);

    vi.mocked(api.monitoring.get).mockResolvedValue({
      data: [{ dinsight_x: 10, dinsight_y: 20, metadata: { tag: 'm1' } }],
    } as any);

    const { result } = renderHook(
      () => useBaselineMonitoringData({ dinsightId: 7, monitoringMode: 'rows' }),
      {
        wrapper: createQueryClientWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isLoadingBaseline).toBe(false);
      expect(result.current.isLoadingMonitoring).toBe(false);
    });

    expect(result.current.baselineData?.dinsight_x).toEqual([1, 2]);
    expect(result.current.monitoringData?.dinsight_y).toEqual([20]);
  });
});
