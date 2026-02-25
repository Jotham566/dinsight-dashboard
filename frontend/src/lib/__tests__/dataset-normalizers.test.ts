import { describe, expect, it } from 'vitest';
import {
  normalizeCoordinateSeriesFromDinsightPayload,
  normalizeCoordinateSeriesFromMonitoringRows,
  normalizeDinsightDatasetSummary,
} from '@/lib/dataset-normalizers';

describe('dataset normalizers', () => {
  it('normalizes baseline payload', () => {
    const result = normalizeCoordinateSeriesFromDinsightPayload({
      dinsight_x: [1, 2],
      dinsight_y: [3, 4],
      point_metadata: [{ a: 1 }, { a: 2 }],
    });

    expect(result).not.toBeNull();
    expect(result?.dinsight_x).toEqual([1, 2]);
    expect(result?.metadata).toHaveLength(2);
  });

  it('normalizes monitoring rows payload', () => {
    const result = normalizeCoordinateSeriesFromMonitoringRows([
      { dinsight_x: 1, dinsight_y: 2, metadata: { line: 'A' } },
    ]);

    expect(result).not.toBeNull();
    expect(result?.dinsight_y).toEqual([2]);
  });

  it('builds dataset summary for valid payload', () => {
    const result = normalizeDinsightDatasetSummary(3, {
      dinsight_id: 10,
      dinsight_x: [1],
      dinsight_y: [2],
    });

    expect(result?.dinsight_id).toBe(10);
    expect(result?.records).toBe(1);
  });
});
