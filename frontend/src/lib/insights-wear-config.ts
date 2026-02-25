export const INSIGHTS_APPLIED_WEAR_CONFIG_KEY = 'insights-applied-wear-config-v1';
export const INSIGHTS_APPLIED_WEAR_CONFIG_EVENT = 'insights-wear-config-updated';
export const INSIGHTS_WEAR_PREFS_FIELD = 'insightsWearTrend';
export const INSIGHTS_DRAFT_WEAR_CONFIG_KEY = 'insights-draft-wear-config-v1';
export const INSIGHTS_DRAFT_WEAR_PREFS_FIELD = 'insightsWearTrendDraft';

export interface AppliedWearTrendConfig {
  datasetId: number;
  metadataColumn: string;
  includeMonitoring: boolean;
  baselineClusterValues: string[];
  baselineRange: { start: string; end: string } | null;
  appliedAt: string;
}

export interface DraftWearTrendConfig {
  datasetId: number;
  metadataColumn: string;
  includeMonitoring: boolean;
  baselineClusterValues: string[];
  baselineRange: { start: string; end: string } | null;
  updatedAt: string;
}

export const parseAppliedWearTrendConfig = (
  payload: string | null
): AppliedWearTrendConfig | null => {
  if (!payload) {
    return null;
  }

  try {
    const raw = JSON.parse(payload) as Partial<AppliedWearTrendConfig>;
    if (
      typeof raw.datasetId !== 'number' ||
      !Number.isFinite(raw.datasetId) ||
      !raw.metadataColumn ||
      typeof raw.metadataColumn !== 'string'
    ) {
      return null;
    }

    const baselineClusterValues = Array.isArray(raw.baselineClusterValues)
      ? raw.baselineClusterValues
          .map((value) => String(value))
          .filter((value) => value.trim().length > 0)
      : [];

    const baselineRange =
      raw.baselineRange &&
      typeof raw.baselineRange.start === 'string' &&
      typeof raw.baselineRange.end === 'string' &&
      raw.baselineRange.start &&
      raw.baselineRange.end
        ? { start: raw.baselineRange.start, end: raw.baselineRange.end }
        : null;

    return {
      datasetId: raw.datasetId,
      metadataColumn: raw.metadataColumn,
      includeMonitoring: raw.includeMonitoring !== false,
      baselineClusterValues,
      baselineRange,
      appliedAt: typeof raw.appliedAt === 'string' ? raw.appliedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const parseAppliedWearTrendConfigFromUnknown = (
  payload: unknown
): AppliedWearTrendConfig | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  try {
    return parseAppliedWearTrendConfig(JSON.stringify(payload));
  } catch {
    return null;
  }
};

export const parseDraftWearTrendConfig = (payload: string | null): DraftWearTrendConfig | null => {
  if (!payload) {
    return null;
  }

  try {
    const raw = JSON.parse(payload) as Partial<DraftWearTrendConfig>;
    if (
      typeof raw.datasetId !== 'number' ||
      !Number.isFinite(raw.datasetId) ||
      !raw.metadataColumn ||
      typeof raw.metadataColumn !== 'string'
    ) {
      return null;
    }

    const baselineClusterValues = Array.isArray(raw.baselineClusterValues)
      ? raw.baselineClusterValues
          .map((value) => String(value))
          .filter((value) => value.trim().length > 0)
      : [];

    const baselineRange =
      raw.baselineRange &&
      typeof raw.baselineRange.start === 'string' &&
      typeof raw.baselineRange.end === 'string' &&
      raw.baselineRange.start &&
      raw.baselineRange.end
        ? { start: raw.baselineRange.start, end: raw.baselineRange.end }
        : null;

    return {
      datasetId: raw.datasetId,
      metadataColumn: raw.metadataColumn,
      includeMonitoring: raw.includeMonitoring !== false,
      baselineClusterValues,
      baselineRange,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const parseDraftWearTrendConfigFromUnknown = (
  payload: unknown
): DraftWearTrendConfig | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  try {
    return parseDraftWearTrendConfig(JSON.stringify(payload));
  } catch {
    return null;
  }
};

export const pickNewestWearConfig = (
  first: AppliedWearTrendConfig | null,
  second: AppliedWearTrendConfig | null
): AppliedWearTrendConfig | null => {
  if (!first) return second;
  if (!second) return first;
  const firstTs = Date.parse(first.appliedAt);
  const secondTs = Date.parse(second.appliedAt);
  if (!Number.isFinite(firstTs)) return second;
  if (!Number.isFinite(secondTs)) return first;
  return secondTs >= firstTs ? second : first;
};

export const pickNewestDraftWearConfig = (
  first: DraftWearTrendConfig | null,
  second: DraftWearTrendConfig | null
): DraftWearTrendConfig | null => {
  if (!first) return second;
  if (!second) return first;
  const firstTs = Date.parse(first.updatedAt);
  const secondTs = Date.parse(second.updatedAt);
  if (!Number.isFinite(firstTs)) return second;
  if (!Number.isFinite(secondTs)) return first;
  return secondTs >= firstTs ? second : first;
};
