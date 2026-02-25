import { MetadataEntry } from '@/types/metadata';
import {
  alignMetadataLength,
  normalizeMetadataArray,
  normalizeMetadataEntry,
} from '@/utils/metadata';

export interface DinsightDatasetSummary {
  dinsight_id: number;
  name: string;
  type: 'dinsight';
  records?: number;
}

export interface CoordinateSeries {
  dinsight_x: number[];
  dinsight_y: number[];
  metadata: MetadataEntry[];
}

const toFiniteNumber = (value: unknown): number | null => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

export const isValidPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export const normalizeDinsightDatasetSummary = (
  id: number,
  payload: unknown
): DinsightDatasetSummary | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const x = Array.isArray(data.dinsight_x) ? data.dinsight_x : null;
  const y = Array.isArray(data.dinsight_y) ? data.dinsight_y : null;

  if (!x || !y || x.length === 0 || y.length === 0) {
    return null;
  }

  const resolvedId =
    typeof data.dinsight_id === 'number' && data.dinsight_id > 0 ? data.dinsight_id : id;

  return {
    dinsight_id: resolvedId,
    name: `DInsight ID ${resolvedId}`,
    type: 'dinsight',
    records: Math.min(x.length, y.length),
  };
};

export const normalizeCoordinateSeriesFromDinsightPayload = (
  payload: unknown,
  includeMetadata = true
): CoordinateSeries | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const rawX = Array.isArray(data.dinsight_x) ? data.dinsight_x : [];
  const rawY = Array.isArray(data.dinsight_y) ? data.dinsight_y : [];

  const x: number[] = [];
  const y: number[] = [];

  const size = Math.min(rawX.length, rawY.length);
  for (let i = 0; i < size; i++) {
    const xValue = toFiniteNumber(rawX[i]);
    const yValue = toFiniteNumber(rawY[i]);
    if (xValue == null || yValue == null) {
      continue;
    }
    x.push(xValue);
    y.push(yValue);
  }

  if (x.length === 0 || y.length === 0) {
    return null;
  }

  const metadata = includeMetadata
    ? alignMetadataLength(normalizeMetadataArray(data.point_metadata), x.length)
    : [];

  return {
    dinsight_x: x,
    dinsight_y: y,
    metadata,
  };
};

export const normalizeCoordinateSeriesFromMonitoringRows = (
  payload: unknown,
  includeMetadata = true
): CoordinateSeries | null => {
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as Record<string, unknown>).data)
      ? ((payload as Record<string, unknown>).data as unknown[])
      : [];

  if (rows.length === 0) {
    return null;
  }

  const x: number[] = [];
  const y: number[] = [];
  const metadata: MetadataEntry[] = [];

  rows.forEach((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return;
    }

    const data = row as Record<string, unknown>;
    const xValue = toFiniteNumber(data.dinsight_x);
    const yValue = toFiniteNumber(data.dinsight_y);

    if (xValue == null || yValue == null) {
      return;
    }

    x.push(xValue);
    y.push(yValue);
    metadata.push(includeMetadata ? normalizeMetadataEntry(data.metadata) : {});
  });

  if (x.length === 0 || y.length === 0) {
    return null;
  }

  return {
    dinsight_x: x,
    dinsight_y: y,
    metadata: includeMetadata ? alignMetadataLength(metadata, x.length) : [],
  };
};

export const normalizeCoordinateSeriesFromMonitoringCoordinates = (
  payload: unknown,
  includeMetadata = true
): CoordinateSeries | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const rawX = Array.isArray(data.dinsight_x) ? data.dinsight_x : [];
  const rawY = Array.isArray(data.dinsight_y) ? data.dinsight_y : [];

  const x: number[] = [];
  const y: number[] = [];

  const size = Math.min(rawX.length, rawY.length);
  for (let i = 0; i < size; i++) {
    const xValue = toFiniteNumber(rawX[i]);
    const yValue = toFiniteNumber(rawY[i]);
    if (xValue == null || yValue == null) {
      continue;
    }
    x.push(xValue);
    y.push(yValue);
  }

  if (x.length === 0 || y.length === 0) {
    return null;
  }

  const metadata = includeMetadata
    ? alignMetadataLength(normalizeMetadataArray(data.metadata), x.length)
    : [];

  return {
    dinsight_x: x,
    dinsight_y: y,
    metadata,
  };
};
