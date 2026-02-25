import { useMemo } from 'react';
import {
  deriveMachineHealthStatus,
  MachineHealthInput,
  MachineHealthResult,
  MachineHealthThresholds,
} from '@/lib/health-status';

export function useMachineHealthStatus(
  input: MachineHealthInput,
  thresholds?: MachineHealthThresholds
): MachineHealthResult {
  const { anomalyPercentage, wearTrendScore } = input;
  return useMemo(
    () => deriveMachineHealthStatus({ anomalyPercentage, wearTrendScore }, thresholds),
    [anomalyPercentage, wearTrendScore, thresholds]
  );
}
