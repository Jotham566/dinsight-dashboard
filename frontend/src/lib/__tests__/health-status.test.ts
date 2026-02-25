import { describe, expect, it } from 'vitest';
import { deriveMachineHealthStatus } from '@/lib/health-status';

describe('deriveMachineHealthStatus', () => {
  it('returns OK when inputs are below thresholds', () => {
    const result = deriveMachineHealthStatus({ anomalyPercentage: 2, wearTrendScore: 0.2 });
    expect(result.state).toBe('OK');
  });

  it('returns Deteriorating when anomaly exceeds deteriorating threshold', () => {
    const result = deriveMachineHealthStatus({ anomalyPercentage: 8, wearTrendScore: 0.2 });
    expect(result.state).toBe('Deteriorating');
  });

  it('returns Failing when wear exceeds failing threshold', () => {
    const result = deriveMachineHealthStatus({ anomalyPercentage: 2, wearTrendScore: 1.4 });
    expect(result.state).toBe('Failing');
  });
});
