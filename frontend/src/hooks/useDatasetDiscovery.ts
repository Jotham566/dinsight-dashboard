import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { DinsightDatasetSummary, normalizeDinsightDatasetSummary } from '@/lib/dataset-normalizers';

export interface DatasetDiscoveryOptions {
  enabled?: boolean;
  maxId?: number;
  maxConsecutiveMisses?: number;
  staleTime?: number;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  queryKey?: readonly unknown[];
}

export interface DatasetDiscoveryResult {
  datasets: DinsightDatasetSummary[];
  datasetIds: number[];
  latestDatasetId: number | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<unknown>;
}

const defaultOptions: Required<Omit<DatasetDiscoveryOptions, 'queryKey'>> = {
  enabled: true,
  maxId: 1000,
  maxConsecutiveMisses: 5,
  staleTime: 10_000,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
};
const EMPTY_DATASETS: DinsightDatasetSummary[] = [];

export function useDatasetDiscovery(options?: DatasetDiscoveryOptions): DatasetDiscoveryResult {
  const merged = { ...defaultOptions, ...options };

  const query = useQuery<DinsightDatasetSummary[]>({
    queryKey: options?.queryKey ?? ['available-dinsight-ids'],
    enabled: merged.enabled,
    staleTime: merged.staleTime,
    refetchInterval: merged.refetchInterval,
    refetchOnWindowFocus: merged.refetchOnWindowFocus,
    retry: false,
    queryFn: async () => {
      const results: DinsightDatasetSummary[] = [];
      const seenIds = new Set<number>();
      let consecutiveMisses = 0;

      for (
        let id = 1;
        id <= merged.maxId && consecutiveMisses < merged.maxConsecutiveMisses;
        id++
      ) {
        try {
          const response = await api.analysis.getDinsight(id);
          const summary = normalizeDinsightDatasetSummary(id, response?.data?.data);

          if (response?.data?.success && summary) {
            if (!seenIds.has(summary.dinsight_id)) {
              seenIds.add(summary.dinsight_id);
              results.push(summary);
            }
            consecutiveMisses = 0;
          } else {
            consecutiveMisses += 1;
          }
        } catch {
          consecutiveMisses += 1;
        }
      }

      return results.sort((a, b) => a.dinsight_id - b.dinsight_id);
    },
  });

  const datasets = query.data ?? EMPTY_DATASETS;
  const datasetIds = useMemo(() => datasets.map((dataset) => dataset.dinsight_id), [datasets]);
  const latestDatasetId = datasets.length > 0 ? datasets[datasets.length - 1].dinsight_id : null;

  return {
    datasets,
    datasetIds,
    latestDatasetId,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
