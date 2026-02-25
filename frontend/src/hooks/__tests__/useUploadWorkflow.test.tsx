import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useUploadWorkflow } from '@/hooks/useUploadWorkflow';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual('@/lib/api-client');
  return {
    ...actual,
    api: {
      ...((actual as any).api ?? {}),
      analysis: {
        ...((actual as any).api?.analysis ?? {}),
        upload: vi.fn(),
        getDinsight: vi.fn(),
      },
      monitoring: {
        ...((actual as any).api?.monitoring ?? {}),
        upload: vi.fn(),
      },
    },
    apiClient: {
      get: vi.fn(),
    },
  };
});

describe('useUploadWorkflow', () => {
  it('transitions to error when baseline upload fails', async () => {
    vi.mocked(api.analysis.upload).mockRejectedValue(new Error('upload failed'));

    const { result } = renderHook(() => useUploadWorkflow());

    await act(async () => {
      await result.current.uploadBaseline([new File(['a'], 'baseline.csv')]);
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.state.errorMessage).toContain('failed');
  });
});
