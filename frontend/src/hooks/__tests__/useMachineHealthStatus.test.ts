import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMachineHealthStatus } from '@/hooks/useMachineHealthStatus';

describe('useMachineHealthStatus', () => {
  it('returns failing when anomaly is high', () => {
    const { result } = renderHook(() => useMachineHealthStatus({ anomalyPercentage: 18 }));
    expect(result.current.state).toBe('Failing');
  });

  it('returns ok when values are low', () => {
    const { result } = renderHook(() =>
      useMachineHealthStatus({ anomalyPercentage: 1, wearTrendScore: 0.1 })
    );

    expect(result.current.state).toBe('OK');
  });
});
