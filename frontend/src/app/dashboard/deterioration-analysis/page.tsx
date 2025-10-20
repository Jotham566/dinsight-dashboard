'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  Download,
  Settings2,
  Search,
  X,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { api, apiClient } from '@/lib/api-client';
import { ApiResponse } from '@/types';
import type { Layout, Shape, Annotations } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

type DatasetType = 'baseline' | 'monitoring';

type DinsightDataset = {
  dinsight_id: number;
  name: string;
};

type MetadataColumnsResponse = {
  columns: string[];
};

type DeteriorationInterval = {
  label: string;
  metadata_value: string;
  dataset_type: DatasetType;
  sort_index: number;
  point_count: number;
  centroid: {
    x: number;
    y: number;
  };
  distance_from_g0: number;
  distance_from_previous?: number | null;
  is_baseline_cluster: boolean;
};

type DeteriorationAnalysis = {
  metadata_column: string;
  g0: {
    x: number;
    y: number;
    point_count: number;
    labels: string[];
  };
  intervals: DeteriorationInterval[];
  distances: {
    g0_to_gi: Array<{
      label: string;
      dataset_type: DatasetType;
      distance: number;
    }>;
    g0_to_gi_mean: number;
    gi_to_gi_plus_1: Array<{
      from_label: string;
      from_dataset_type: DatasetType;
      to_label: string;
      to_dataset_type: DatasetType;
      distance: number;
    }>;
    gi_to_gi_plus_1_mean: number;
  };
  stats: {
    baseline_point_count: number;
    monitoring_point_count: number;
    skipped_baseline: number;
    skipped_monitoring: number;
  };
  baseline_cluster: {
    selected_values: string[];
    range?: {
      start: string;
      end: string;
    };
  };
};

const fetchAvailableDinsightDatasets = async (): Promise<DinsightDataset[]> => {
  const datasets: DinsightDataset[] = [];
  const seen = new Set<number>();
  let id = 1;
  let consecutiveMisses = 0;
  const maxMisses = 5;
  const maxId = 600; // Gardrail to avoid unbounded scans

  while (consecutiveMisses < maxMisses && id <= maxId) {
    try {
      const response = await api.analysis.getDinsight(id);
      const payload = response?.data?.data;
      const resolvedId =
        payload && typeof payload.dinsight_id === 'number' && payload.dinsight_id > 0
          ? payload.dinsight_id
          : id;

      if (
        response?.data?.success &&
        Array.isArray(payload?.dinsight_x) &&
        Array.isArray(payload?.dinsight_y) &&
        payload.dinsight_x.length > 0 &&
        payload.dinsight_y.length > 0
      ) {
        if (!seen.has(resolvedId)) {
          datasets.push({
            dinsight_id: resolvedId,
            name: `DInsight ID ${resolvedId}`,
          });
          seen.add(resolvedId);
        }
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
      }
    } catch (error) {
      consecutiveMisses++;
    }

    id++;
  }

  return datasets.sort((a, b) => a.dinsight_id - b.dinsight_id);
};

const formatDecimal = (value: number | undefined, digits = 3) => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return value.toFixed(digits);
};

const uniqueKeyFromValues = (values: string[]) => values.slice().sort().join('|');

const truncateLabel = (value: string, maxLength = 14) => {
  if (!value) return '';
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
};

// Info tooltip component (portalled, fixed-position with collision handling)
const InfoTooltip = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  }>({ top: 0, left: 0, placement: 'bottom' });
  const [closeTimer, setCloseTimer] = useState<number | null>(null);
  const tooltipId = useMemo(() => `tooltip-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8; // px gap between trigger and tooltip
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const scrollX = window.scrollX || document.documentElement.scrollLeft;

    const provisionalWidth = 320; // ~w-80 (20rem)
    const centerLeft = rect.left + rect.width / 2 + scrollX;
    let left = centerLeft; // translateX(-50%) applied via style
    let top = rect.bottom + margin + scrollY;
    let placement: 'top' | 'bottom' = 'bottom';

    // If not enough space below, place on top based on measured height
    if (tooltipRef.current) {
      const ttHeight = tooltipRef.current.offsetHeight;
      if (rect.bottom + margin + ttHeight > window.innerHeight) {
        top = rect.top - margin - ttHeight + scrollY;
        placement = 'top';
      }
      const ttWidth = tooltipRef.current.offsetWidth || provisionalWidth;
      const half = ttWidth / 2;
      const minLeft = scrollX + margin + half;
      const maxLeft = scrollX + window.innerWidth - margin - half;
      left = Math.min(Math.max(left, minLeft), maxLeft);
    } else {
      const half = provisionalWidth / 2;
      const minLeft = scrollX + margin + half;
      const maxLeft = scrollX + window.innerWidth - margin - half;
      left = Math.min(Math.max(left, minLeft), maxLeft);
    }

    setPosition({ top, left, placement });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, updatePosition]);

  // Recalculate after first paint to use actual tooltip size
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => updatePosition(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen, updatePosition]);

  const open = useCallback(() => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      setCloseTimer(null);
    }
    setIsOpen(true);
  }, [closeTimer]);

  const delayedClose = useCallback(() => {
    const id = window.setTimeout(() => setIsOpen(false), 150);
    setCloseTimer(id as unknown as number);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  return (
    <span className="inline-flex">
      <button
        ref={triggerRef}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onMouseEnter={open}
        onMouseLeave={delayedClose}
        onFocus={open}
        onBlur={delayedClose}
        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
        aria-label={title}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        type="button"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {mounted && isOpen && typeof window !== 'undefined'
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              aria-live="polite"
              onMouseEnter={open}
              onMouseLeave={delayedClose}
              className="pointer-events-auto z-[9999] fixed w-80 max-w-[90vw] p-4 text-sm backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border-2 border-primary/20 dark:border-primary/30 rounded-lg shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
              style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
            >
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
              </div>
            </div>,
            document.body
          )
        : null}
    </span>
  );
};

export default function DeteriorationAnalysisPage() {
  const [selectedDinsightId, setSelectedDinsightId] = useState<number | null>(null);
  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [metadataColumn, setMetadataColumn] = useState('');
  const [includeMonitoring, setIncludeMonitoring] = useState(true);
  const [selectedClusterValues, setSelectedClusterValues] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [hasUserAdjustedCluster, setHasUserAdjustedCluster] = useState(false);
  const [showIntervalTable, setShowIntervalTable] = useState(false);
  const [showTransitionTable, setShowTransitionTable] = useState(false);
  const [intervalPage, setIntervalPage] = useState(1);
  const [transitionPage, setTransitionPage] = useState(1);
  const [intervalPageSize, setIntervalPageSize] = useState(10);
  const [transitionPageSize, setTransitionPageSize] = useState(10);
  const [showAllIntervals, setShowAllIntervals] = useState(false);
  const [baselineFilterText, setBaselineFilterText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Local storage keys
  const STORAGE_KEYS = {
    selectedId: 'deterioration:selectedDinsightId',
    metadata: 'deterioration:metadataColumn',
    includeMonitoring: 'deterioration:includeMonitoring',
    clusterValues: 'deterioration:clusterValues',
    rangeStart: 'deterioration:rangeStart',
    rangeEnd: 'deterioration:rangeEnd',
    intervalPageSize: 'deterioration:intervalPageSize',
    transitionPageSize: 'deterioration:transitionPageSize',
  } as const;

  // Hydrate persisted controls on first mount
  useEffect(() => {
    try {
      const storedId = localStorage.getItem(STORAGE_KEYS.selectedId);
      if (storedId) setSelectedDinsightId(Number(storedId));
      const storedMeta = localStorage.getItem(STORAGE_KEYS.metadata);
      if (storedMeta) setMetadataColumn(storedMeta);
      const storedInclude = localStorage.getItem(STORAGE_KEYS.includeMonitoring);
      if (storedInclude != null) setIncludeMonitoring(storedInclude === 'true');
      const storedCluster = localStorage.getItem(STORAGE_KEYS.clusterValues);
      if (storedCluster) setSelectedClusterValues(JSON.parse(storedCluster));
      const storedStart = localStorage.getItem(STORAGE_KEYS.rangeStart);
      if (storedStart) setRangeStart(storedStart);
      const storedEnd = localStorage.getItem(STORAGE_KEYS.rangeEnd);
      if (storedEnd) setRangeEnd(storedEnd);
      const storedIntervalSize = localStorage.getItem(STORAGE_KEYS.intervalPageSize);
      if (storedIntervalSize) setIntervalPageSize(Number(storedIntervalSize));
      const storedTransitionSize = localStorage.getItem(STORAGE_KEYS.transitionPageSize);
      if (storedTransitionSize) setTransitionPageSize(Number(storedTransitionSize));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist controls
  useEffect(() => {
    try {
      if (selectedDinsightId != null)
        localStorage.setItem(STORAGE_KEYS.selectedId, String(selectedDinsightId));
      if (metadataColumn) localStorage.setItem(STORAGE_KEYS.metadata, metadataColumn);
      localStorage.setItem(STORAGE_KEYS.includeMonitoring, String(includeMonitoring));
      localStorage.setItem(STORAGE_KEYS.clusterValues, JSON.stringify(selectedClusterValues));
      localStorage.setItem(STORAGE_KEYS.rangeStart, rangeStart);
      localStorage.setItem(STORAGE_KEYS.rangeEnd, rangeEnd);
      localStorage.setItem(STORAGE_KEYS.intervalPageSize, String(intervalPageSize));
      localStorage.setItem(STORAGE_KEYS.transitionPageSize, String(transitionPageSize));
    } catch {}
    // We intentionally persist on these state changes only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedDinsightId,
    metadataColumn,
    includeMonitoring,
    selectedClusterValues,
    rangeStart,
    rangeEnd,
    intervalPageSize,
    transitionPageSize,
  ]);

  // CSV export helper
  const exportCSV = useCallback(
    (
      rows: Array<Record<string, unknown>>,
      columns: Array<{ key: string; header: string }>,
      filename: string
    ) => {
      if (!rows.length) return;
      const header = columns.map((c) => c.header).join(',');
      const escape = (value: unknown) => {
        if (value == null) return '';
        const str = String(value);
        // Escape quotes and wrap if contains comma or newline
        if (/[",\n]/.test(str)) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      const body = rows
        .map((row) => columns.map((c) => escape((row as any)[c.key])).join(','))
        .join('\n');
      const csv = header + '\n' + body;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    []
  );

  const availableDatasetsQuery = useQuery<DinsightDataset[]>({
    queryKey: ['available-dinsight-datasets'],
    queryFn: fetchAvailableDinsightDatasets,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Query for streaming status to enable real-time updates
  const streamingStatusQuery = useQuery({
    queryKey: ['streaming-status', selectedDinsightId],
    enabled: selectedDinsightId != null,
    refetchInterval: 5000, // Check every 5 seconds
    queryFn: async () => {
      if (!selectedDinsightId) return null;
      try {
        const response = await apiClient.get(`/streaming/${selectedDinsightId}/status`);
        return response?.data?.data || null;
      } catch (error) {
        console.warn('Failed to fetch streaming status:', error);
        return null;
      }
    },
  });

  // Update streaming state
  useEffect(() => {
    if (streamingStatusQuery.data) {
      setIsStreaming(streamingStatusQuery.data.is_active === true);
    }
  }, [streamingStatusQuery.data]);

  const metadataColumnsQuery = useQuery<string[]>({
    queryKey: ['deterioration-metadata-columns', selectedDinsightId],
    enabled: selectedDinsightId != null,
    queryFn: async () => {
      if (!selectedDinsightId) return [];
      const response = await api.deterioration.getMetadata(selectedDinsightId);
      const payload = response?.data as ApiResponse<MetadataColumnsResponse>;
      return payload?.data?.columns ?? [];
    },
  });

  const clusterKey = useMemo(
    () => uniqueKeyFromValues(selectedClusterValues),
    [selectedClusterValues]
  );
  const rangeKey = `${rangeStart}::${rangeEnd}`;

  const analysisQuery = useQuery<DeteriorationAnalysis | undefined>({
    queryKey: [
      'deterioration-analysis',
      selectedDinsightId,
      metadataColumn,
      includeMonitoring,
      clusterKey,
      rangeKey,
    ],
    enabled: Boolean(selectedDinsightId && metadataColumn),
    refetchInterval: isStreaming ? 10000 : false, // Refetch every 10 seconds when streaming
    staleTime: isStreaming ? 5000 : 30000, // Consider data stale faster when streaming
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on component mount if data exists
    placeholderData: (previousData) => previousData, // Keep previous data while loading new data
    queryFn: async () => {
      if (!selectedDinsightId || !metadataColumn) {
        return undefined;
      }

      const payload: {
        metadata_column: string;
        include_monitoring: boolean;
        baseline_cluster: {
          values: string[];
          range?: { start: string; end: string };
        };
      } = {
        metadata_column: metadataColumn,
        include_monitoring: includeMonitoring,
        baseline_cluster: {
          values: selectedClusterValues,
        },
      };

      if (rangeStart && rangeEnd) {
        payload.baseline_cluster.range = {
          start: rangeStart,
          end: rangeEnd,
        };
      }

      const response = await api.deterioration.analyze(selectedDinsightId, payload);
      const payloadData = response?.data as ApiResponse<DeteriorationAnalysis>;
      return payloadData?.data;
    },
  });

  useEffect(() => {
    if (!availableDatasetsQuery.data || availableDatasetsQuery.data.length === 0) {
      return;
    }

    if (!selectedDinsightId) {
      const latest = availableDatasetsQuery.data[availableDatasetsQuery.data.length - 1];
      setSelectedDinsightId(latest.dinsight_id);
    }
  }, [availableDatasetsQuery.data, selectedDinsightId]);

  useEffect(() => {
    const columns = metadataColumnsQuery.data;
    if (!columns || columns.length === 0) {
      setMetadataColumn('');
      return;
    }

    setMetadataColumn((previous) => {
      if (previous && columns.includes(previous)) {
        return previous;
      }
      return columns[0];
    });
  }, [metadataColumnsQuery.data]);

  useEffect(() => {
    setSelectedClusterValues([]);
    setRangeStart('');
    setRangeEnd('');
    setHasUserAdjustedCluster(false);
  }, [selectedDinsightId, metadataColumn]);

  useEffect(() => {
    if (!analysisQuery.data) {
      return;
    }

    if (!hasUserAdjustedCluster) {
      const labels = analysisQuery.data.g0?.labels || [];
      const sortedIncoming = uniqueKeyFromValues(labels);
      const sortedCurrent = uniqueKeyFromValues(selectedClusterValues);

      if (sortedIncoming !== sortedCurrent) {
        setSelectedClusterValues(labels);
      }
    }
  }, [analysisQuery.data, hasUserAdjustedCluster, selectedClusterValues]);

  const analysisData = analysisQuery.data;

  const baselineIntervals = useMemo(
    () => analysisData?.intervals.filter((interval) => interval.dataset_type === 'baseline') ?? [],
    [analysisData?.intervals]
  );

  const filteredBaselineIntervals = useMemo(() => {
    if (!baselineFilterText.trim()) {
      return baselineIntervals;
    }
    const searchTerm = baselineFilterText.toLowerCase();
    return baselineIntervals.filter((interval) =>
      interval.metadata_value.toLowerCase().includes(searchTerm)
    );
  }, [baselineIntervals, baselineFilterText]);

  useEffect(() => {
    setIntervalPage(1);
    setTransitionPage(1);
  }, [selectedDinsightId, metadataColumn, clusterKey, rangeKey]);

  const handleManualLoad = () => {
    const trimmed = manualId.trim();
    if (!trimmed) {
      setManualError('Enter a valid DInsight ID.');
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setManualError('DInsight ID must be a positive number.');
      return;
    }

    setManualError(null);
    setSelectedDinsightId(parsed);
  };

  const handleToggleClusterValue = useCallback((value: string) => {
    setSelectedClusterValues((current) => {
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return next;
    });
    setHasUserAdjustedCluster(true);
  }, []);

  const handleResetCluster = () => {
    if (analysisData?.g0?.labels) {
      setSelectedClusterValues(analysisData.g0.labels);
      setRangeStart('');
      setRangeEnd('');
      setHasUserAdjustedCluster(false);
    }
  };

  const g0Chart = useMemo(() => {
    if (!analysisData) {
      return null;
    }

    const intervals = analysisData.intervals;
    const xValues = intervals.map((interval) => interval.sort_index);
    const fullLabels = intervals.map((interval) => interval.metadata_value);
    const maxTicks = 8;
    const tickStep = Math.max(1, Math.ceil(intervals.length / maxTicks));
    const tickVals: number[] = [];
    const tickLabels: string[] = [];

    xValues.forEach((value, index) => {
      if (index % tickStep === 0 || index === intervals.length - 1) {
        tickVals.push(value);
        tickLabels.push(truncateLabel(fullLabels[index]));
      }
    });

    const baselineSeries = intervals.map((interval) =>
      interval.dataset_type === 'baseline' ? interval.distance_from_g0 : null
    );
    const monitoringSeries = intervals.map((interval) =>
      interval.dataset_type === 'monitoring' ? interval.distance_from_g0 : null
    );

    const intervalCustomData = intervals.map((interval) => [
      interval.metadata_value,
      interval.dataset_type === 'baseline' ? 'Baseline' : 'Monitoring',
      interval.point_count,
    ]);

    const clusterShapes: Partial<Shape>[] = intervals
      .filter((interval) => interval.is_baseline_cluster)
      .map(
        (interval): Partial<Shape> => ({
          type: 'rect',
          xref: 'x',
          yref: 'paper',
          x0: interval.sort_index - 0.4,
          x1: interval.sort_index + 0.4,
          y0: 0,
          y1: 1,
          fillcolor: 'rgba(16, 185, 129, 0.12)',
          line: { width: 0 },
          layer: 'below',
        })
      );

    const meanLine: Partial<Shape> = {
      type: 'line',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      x1: 1,
      y0: analysisData.distances.g0_to_gi_mean,
      y1: analysisData.distances.g0_to_gi_mean,
      line: {
        color: 'rgba(148, 163, 184, 0.7)',
        dash: 'dash',
        width: 2,
      },
    };

    const annotations: Partial<Annotations>[] = [
      {
        xref: 'paper',
        yref: 'y',
        x: 0.98,
        y: analysisData.distances.g0_to_gi_mean,
        text: `Mean distance: ${formatDecimal(analysisData.distances.g0_to_gi_mean)}`,
        showarrow: false,
        align: 'right',
        font: { size: 12, color: 'rgba(30, 41, 59, 0.85)' },
        bgcolor: 'rgba(241, 245, 249, 0.7)',
        borderpad: 4,
      },
    ];

    const layout: Partial<Layout> = {
      height: 360,
      margin: { l: 56, r: 20, t: 32, b: 48 },
      xaxis: {
        title: { text: metadataColumn ? `${metadataColumn} (Interval Order)` : 'Interval Order' },
        tickmode: 'array',
        tickvals: tickVals,
        ticktext: tickLabels,
        tickangle: 0,
        automargin: true,
        tickfont: { size: 11 },
      },
      yaxis: {
        title: { text: 'Distance to G₀' },
        zeroline: true,
        zerolinecolor: 'rgba(148, 163, 184, 0.35)',
        gridcolor: 'rgba(148, 163, 184, 0.2)',
      },
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.05,
        xanchor: 'right',
        x: 1,
      },
      shapes: [...clusterShapes, meanLine],
      annotations,
      hovermode: 'closest',
      plot_bgcolor: '#FFFFFF',
      paper_bgcolor: '#FFFFFF',
    };

    return {
      data: [
        {
          x: xValues,
          y: baselineSeries,
          text: fullLabels,
          mode: 'lines+markers',
          name: 'Baseline',
          marker: {
            color: '#2563EB',
            size: 8,
            symbol: 'circle',
          },
          line: {
            color: '#2563EB',
            width: 2,
          },
          customdata: intervalCustomData,
          hovertemplate:
            'Interval %{customdata[0]}<br>%{customdata[2]} pts · %{customdata[1]}<br>Distance: %{y:.4f}<extra></extra>',
          connectgaps: false,
        },
        {
          x: xValues,
          y: monitoringSeries,
          text: fullLabels,
          mode: 'lines+markers',
          name: 'Monitoring',
          marker: {
            color: '#DC2626',
            size: 8,
            symbol: 'square',
          },
          line: {
            color: '#DC2626',
            width: 2,
          },
          customdata: intervalCustomData,
          hovertemplate:
            'Interval %{customdata[0]}<br>%{customdata[2]} pts · %{customdata[1]}<br>Distance: %{y:.4f}<extra></extra>',
          connectgaps: false,
        },
      ],
      layout,
      config: {
        responsive: true,
        displaylogo: false,
      },
    };
  }, [analysisData, metadataColumn]);

  const consecutiveChart = useMemo(() => {
    if (!analysisData) {
      return null;
    }

    const distances = analysisData.distances.gi_to_gi_plus_1;
    if (!distances || distances.length === 0) {
      return null;
    }

    const xValues = distances.map((_, index) => index + 1);
    const maxTicks = 8;
    const tickStep = Math.max(1, Math.ceil(distances.length / maxTicks));
    const tickVals: number[] = [];
    const tickLabels: string[] = [];

    xValues.forEach((value, index) => {
      if (index % tickStep === 0 || index === distances.length - 1) {
        tickVals.push(value);
        tickLabels.push(`#${value}`);
      }
    });
    const transitionLabels = distances.map((entry) => `${entry.from_label} → ${entry.to_label}`);

    const series = distances.map((entry) => entry.distance);
    const transitionCustomData = distances.map((entry) => [
      entry.from_label,
      entry.to_label,
      entry.from_dataset_type === 'baseline' ? 'Baseline' : 'Monitoring',
      entry.to_dataset_type === 'baseline' ? 'Baseline' : 'Monitoring',
    ]);

    const meanLine: Partial<Shape> = {
      type: 'line',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      x1: 1,
      y0: analysisData.distances.gi_to_gi_plus_1_mean,
      y1: analysisData.distances.gi_to_gi_plus_1_mean,
      line: {
        color: 'rgba(148, 163, 184, 0.7)',
        dash: 'dash',
        width: 2,
      },
    };

    const annotations: Partial<Annotations>[] = [
      {
        xref: 'paper',
        yref: 'y',
        x: 0.98,
        y: analysisData.distances.gi_to_gi_plus_1_mean,
        text: `Mean distance: ${formatDecimal(analysisData.distances.gi_to_gi_plus_1_mean)}`,
        showarrow: false,
        align: 'right',
        font: { size: 12, color: 'rgba(30, 41, 59, 0.85)' },
        bgcolor: 'rgba(241, 245, 249, 0.7)',
        borderpad: 4,
      },
    ];

    const layout: Partial<Layout> = {
      height: 360,
      margin: { l: 56, r: 20, t: 32, b: 48 },
      xaxis: {
        title: {
          text: metadataColumn
            ? `${metadataColumn} Transition # (Gi → Gi₊₁)`
            : 'Transition # (Gi → Gi₊₁)',
        },
        tickmode: 'array',
        tickvals: tickVals,
        ticktext: tickLabels,
        tickangle: 0,
        automargin: true,
        tickfont: { size: 11 },
      },
      yaxis: {
        title: { text: 'Consecutive Distance' },
        zeroline: true,
        zerolinecolor: 'rgba(148, 163, 184, 0.35)',
        gridcolor: 'rgba(148, 163, 184, 0.2)',
      },
      shapes: [meanLine],
      annotations,
      hovermode: 'closest',
      legend: {
        orientation: 'h',
        yanchor: 'bottom',
        y: 1.05,
        xanchor: 'right',
        x: 1,
      },
      plot_bgcolor: '#FFFFFF',
      paper_bgcolor: '#FFFFFF',
    };

    return {
      data: [
        {
          x: xValues,
          y: series,
          text: transitionLabels,
          mode: 'lines+markers',
          name: 'Gi → Gi+1 Distance',
          marker: {
            color: '#14B8A6',
            size: 8,
            symbol: 'circle',
          },
          line: {
            color: '#0F766E',
            width: 2,
          },
          customdata: transitionCustomData,
          hovertemplate:
            'Transition %{x}: %{customdata[0]} → %{customdata[1]}<br>Source %{customdata[2]} · Dest %{customdata[3]}<br>Distance: %{y:.4f}<extra></extra>',
        },
      ],
      layout,
      config: {
        responsive: true,
        displaylogo: false,
      },
    };
  }, [analysisData, metadataColumn]);

  const intervalTableRows = useMemo(() => {
    if (!analysisData) return [];
    return analysisData.intervals.map((interval) => ({
      key: `${interval.dataset_type}-${interval.metadata_value}-${interval.sort_index}`,
      ...interval,
    }));
  }, [analysisData]);

  const consecutiveRows = useMemo(
    () => analysisData?.distances.gi_to_gi_plus_1 ?? [],
    [analysisData?.distances.gi_to_gi_plus_1]
  );

  useEffect(() => {
    if (intervalTableRows.length === 0) {
      setIntervalPage(1);
      return;
    }
    const total = Math.max(1, Math.ceil(intervalTableRows.length / intervalPageSize));
    setIntervalPage((current) => {
      const clamped = Math.min(Math.max(current, 1), total);
      return clamped;
    });
  }, [intervalTableRows.length, intervalPageSize]);

  useEffect(() => {
    if (consecutiveRows.length === 0) {
      setTransitionPage(1);
      return;
    }
    const total = Math.max(1, Math.ceil(consecutiveRows.length / transitionPageSize));
    setTransitionPage((current) => {
      const clamped = Math.min(Math.max(current, 1), total);
      return clamped;
    });
  }, [consecutiveRows.length, transitionPageSize]);

  const intervalTotalPages = Math.max(1, Math.ceil(intervalTableRows.length / intervalPageSize));
  const paginatedIntervalRows = useMemo(() => {
    const start = (intervalPage - 1) * intervalPageSize;
    return intervalTableRows.slice(start, start + intervalPageSize);
  }, [intervalTableRows, intervalPage, intervalPageSize]);

  const intervalPageStart = intervalTableRows.length
    ? (intervalPage - 1) * intervalPageSize + 1
    : 0;
  const intervalPageEnd = Math.min(intervalPage * intervalPageSize, intervalTableRows.length);

  const transitionTotalPages = Math.max(1, Math.ceil(consecutiveRows.length / transitionPageSize));
  const paginatedConsecutiveRows = useMemo(() => {
    const start = (transitionPage - 1) * transitionPageSize;
    return consecutiveRows.slice(start, start + transitionPageSize);
  }, [consecutiveRows, transitionPage, transitionPageSize]);

  const transitionPageStart = consecutiveRows.length
    ? (transitionPage - 1) * transitionPageSize + 1
    : 0;
  const transitionPageEnd = Math.min(transitionPage * transitionPageSize, consecutiveRows.length);

  const datasetOptions = availableDatasetsQuery.data ?? [];
  const metadataOptions = metadataColumnsQuery.data ?? [];

  const analysisError = analysisQuery.error as Error | undefined;

  const isRefreshing =
    availableDatasetsQuery.isFetching ||
    metadataColumnsQuery.isFetching ||
    analysisQuery.isFetching;

  const handleRefresh = () => {
    availableDatasetsQuery.refetch();
    metadataColumnsQuery.refetch();
    analysisQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="sticky top-0 z-10 glass-card backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Deterioration Insights</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 max-w-2xl">
                  Monitor machine health by tracking drift from baseline behavior and detecting
                  volatility patterns over time.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isStreaming && (
                <Badge variant="secondary" className="animate-pulse">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live Updates
                </Badge>
              )}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="glass-card hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Modern Layout: Sidebar + Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Control Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Dataset Selection Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <Settings2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Dataset</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Baseline Dataset
                  </label>
                  <Select
                    value={selectedDinsightId ? String(selectedDinsightId) : undefined}
                    onValueChange={(value) => {
                      setSelectedDinsightId(Number(value));
                      setManualId(value);
                      setManualError(null);
                    }}
                  >
                    <SelectTrigger className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100">
                      <SelectValue
                        placeholder={
                          availableDatasetsQuery.isLoading
                            ? 'Loading...'
                            : 'Select baseline dataset'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {datasetOptions.length === 0 && (
                        <SelectItem value="no-datasets" disabled>
                          No datasets discovered yet
                        </SelectItem>
                      )}
                      {datasetOptions.map((dataset) => (
                        <SelectItem key={dataset.dinsight_id} value={String(dataset.dinsight_id)}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Jump to ID
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={manualId}
                      placeholder="e.g. 42"
                      onChange={(event) => setManualId(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleManualLoad();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={handleManualLoad}
                      aria-label="Load DInsight ID"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  {manualError && <p className="text-sm text-destructive">{manualError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Metadata Column
                  </label>
                  <Select
                    value={metadataColumn || undefined}
                    onValueChange={(value) => setMetadataColumn(value)}
                    disabled={metadataColumnsQuery.isLoading || !metadataOptions.length}
                  >
                    <SelectTrigger className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100">
                      <SelectValue
                        placeholder={
                          metadataColumnsQuery.isLoading ? 'Loading...' : 'Select metadata column'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {metadataOptions.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {metadataColumnsQuery.isError && (
                    <p className="text-sm text-destructive mt-2">
                      Unable to load metadata columns for this dataset.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Baseline Cluster Configuration Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50/30 to-accent-teal-50/20 dark:from-emerald-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Settings2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Cluster</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Baseline {metadataColumn || 'Intervals'}
                    </label>
                    {selectedClusterValues.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedClusterValues.length} selected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Pick intervals that reflect healthy behavior
                  </p>

                  {/* Search/Filter Input */}
                  {baselineIntervals.length > 5 && (
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={baselineFilterText}
                        onChange={(e) => setBaselineFilterText(e.target.value)}
                        placeholder="Search intervals..."
                        className="pl-9 pr-9 h-9 text-sm"
                      />
                      {baselineFilterText && (
                        <button
                          onClick={() => setBaselineFilterText('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Intervals List */}
                  <div className="border rounded-lg bg-background/50 overflow-hidden">
                    {baselineIntervals.length === 0 ? (
                      <div className="p-3 text-center">
                        <Badge variant="outline">No baseline intervals available</Badge>
                      </div>
                    ) : filteredBaselineIntervals.length === 0 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        No intervals match &quot;{baselineFilterText}&quot;
                      </div>
                    ) : (
                      <>
                        {/* Column Headers */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                          <div className="w-4"></div>
                          <span className="flex-1 capitalize">{metadataColumn || 'Interval'}</span>
                          <span className="text-right min-w-[60px]">Data Points</span>
                        </div>

                        {/* Scrollable List */}
                        <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                          {filteredBaselineIntervals.map((interval) => {
                            const isSelected = selectedClusterValues.includes(
                              interval.metadata_value
                            );
                            return (
                              <label
                                key={`${interval.metadata_value}-${interval.sort_index}`}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleClusterValue(interval.metadata_value)}
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                />
                                <span className="text-sm flex-1 capitalize">
                                  {interval.metadata_value}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-xs min-w-[60px] justify-center"
                                >
                                  {interval.point_count}
                                </Badge>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {baselineIntervals.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const allValues = baselineIntervals.map((i) => i.metadata_value);
                          setSelectedClusterValues(allValues);
                          setHasUserAdjustedCluster(true);
                        }}
                        className="text-xs h-8 flex-1"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClusterValues([]);
                          setHasUserAdjustedCluster(true);
                        }}
                        className="text-xs h-8 flex-1"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Range (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={rangeStart}
                      placeholder="Start"
                      onChange={(event) => {
                        setRangeStart(event.target.value);
                        setHasUserAdjustedCluster(true);
                      }}
                    />
                    <Input
                      value={rangeEnd}
                      placeholder="End"
                      onChange={(event) => {
                        setRangeEnd(event.target.value);
                        setHasUserAdjustedCluster(true);
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="include-monitoring"
                    type="checkbox"
                    checked={includeMonitoring}
                    onChange={(event) => setIncludeMonitoring(event.target.checked)}
                    className="h-4 w-4 rounded border border-input"
                  />
                  <Label htmlFor="include-monitoring" className="text-sm text-foreground">
                    Include monitoring points
                  </Label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetCluster}
                    disabled={!analysisData?.g0?.labels?.length}
                    className="flex-1"
                  >
                    Reset to G₀
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedClusterValues([]);
                      setRangeStart('');
                      setRangeEnd('');
                      setIncludeMonitoring(true);
                      setHasUserAdjustedCluster(false);
                    }}
                    className="flex-1"
                  >
                    Clear All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">
            {analysisError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Analysis failed</AlertTitle>
                <AlertDescription>{analysisError.message}</AlertDescription>
              </Alert>
            )}

            {/* Tabs for Different Views */}
            <Tabs defaultValue="baseline" className="w-full">
              <TabsList className="grid w-full grid-cols-2 glass-card">
                <TabsTrigger value="baseline" className="gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Distance from Baseline
                </TabsTrigger>
                <TabsTrigger value="transitions" className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Interval Transitions
                </TabsTrigger>
              </TabsList>

              {/* Metric Cards - Visible on Both Tabs */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-6">
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                  <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50/30 to-accent-teal-50/20 dark:from-emerald-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                    <CardTitle className="text-base flex items-center gap-2">
                      Baseline Gravity Center (G₀)
                      <InfoTooltip title="G₀ (Baseline Center)">
                        <p>
                          The machine&apos;s <strong>normal state</strong> — an average of data when
                          performing well.
                        </p>
                        <p className="mt-2">This is your reference point for healthy operation.</p>
                      </InfoTooltip>
                    </CardTitle>
                    <CardDescription>Derived from your selected baseline cluster.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">X</span>
                      <span className="font-medium">{formatDecimal(analysisData?.g0?.x)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Y</span>
                      <span className="font-medium">{formatDecimal(analysisData?.g0?.y)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Points</span>
                      <span className="font-medium">{analysisData?.g0?.point_count ?? '—'}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          Selected intervals
                        </p>
                        {analysisData?.g0?.labels && analysisData.g0.labels.length > 5 && (
                          <button
                            onClick={() => setShowAllIntervals(!showAllIntervals)}
                            className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded px-1"
                          >
                            {showAllIntervals
                              ? 'Show less'
                              : `Show all (${analysisData.g0.labels.length})`}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {analysisData?.g0?.labels?.length ? (
                          (showAllIntervals
                            ? analysisData.g0.labels
                            : analysisData.g0.labels.slice(0, 5)
                          ).map((label) => (
                            <Badge key={label} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Default baseline interval
                          </span>
                        )}
                        {!showAllIntervals &&
                          analysisData?.g0?.labels &&
                          analysisData.g0.labels.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{analysisData.g0.labels.length - 5} more
                            </Badge>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                  <CardHeader className="pb-2 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                    <CardTitle className="text-base">Mean Distances</CardTitle>
                    <CardDescription>Average deviations across the timeline.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Mean G₀ → Gᵢ
                        <InfoTooltip title="G₀ → Gᵢ (Distance from Normal)">
                          <p>
                            <strong>How far</strong> the current condition has moved from the normal
                            state.
                          </p>
                          <p className="mt-2">
                            Bigger distance = more deterioration from healthy operation.
                          </p>
                        </InfoTooltip>
                      </span>
                      <span className="font-medium">
                        {formatDecimal(analysisData?.distances.g0_to_gi_mean)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Mean Gᵢ → Gᵢ₊₁
                        <InfoTooltip title="Gᵢ → Gᵢ₊₁ (Change Between Periods)">
                          <p>
                            <strong>How much</strong> the machine&apos;s condition changes from one
                            period to the next.
                          </p>
                          <p className="mt-2">
                            Large or inconsistent changes indicate instability or fluctuations.
                          </p>
                        </InfoTooltip>
                      </span>
                      <span className="font-medium">
                        {formatDecimal(analysisData?.distances.gi_to_gi_plus_1_mean)}
                      </span>
                    </div>
                    <div className="rounded-md border border-dashed border-muted p-3">
                      <p className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Increasing G₀ → Gᵢ indicates drift away from normal behavior. Large swings
                          in Gᵢ → Gᵢ₊₁ highlight instability between intervals.
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                  <CardHeader className="pb-2 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                    <CardTitle className="text-base">Data Coverage</CardTitle>
                    <CardDescription>Baseline vs monitoring samples included.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Baseline points</span>
                      <span className="font-medium">
                        {analysisData?.stats.baseline_point_count ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monitoring points</span>
                      <span className="font-medium">
                        {analysisData?.stats.monitoring_point_count ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Skipped (baseline)</span>
                      <span>{analysisData?.stats.skipped_baseline ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Skipped (monitoring)</span>
                      <span>{analysisData?.stats.skipped_monitoring ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Baseline Distance Tab */}
              <TabsContent value="baseline" className="space-y-6 mt-6">
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover flex h-full flex-col">
                  <CardHeader className="bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                    <CardTitle className="flex items-center gap-2">
                      Average Deviation from the Baseline (Selected Normal Operation Cluster) (G₀ →
                      Gᵢ)
                      <InfoTooltip title="Understanding This Chart">
                        <p>
                          <strong>Each point (Gᵢ)</strong> shows the machine&apos;s average
                          condition at a specific time.
                        </p>
                        <p className="mt-2">
                          <strong>Distance from G₀</strong> shows how far it has drifted from normal
                          operation.
                        </p>
                        <p className="mt-2">Rising trend = deterioration over time.</p>
                      </InfoTooltip>
                    </CardTitle>
                    <CardDescription>
                      Track how each interval&apos;s centroid diverges from the baseline gravity
                      center. Baseline intervals are shaded for quick reference.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {analysisQuery.isLoading && !analysisData && (
                      <p className="text-sm text-muted-foreground">Running analysis...</p>
                    )}
                    {!analysisQuery.isLoading && !analysisData && (
                      <p className="text-sm text-muted-foreground">
                        Select a dataset and metadata column to generate the deterioration timeline.
                      </p>
                    )}
                    {g0Chart && (
                      <Plot
                        data={g0Chart.data}
                        layout={g0Chart.layout}
                        config={g0Chart.config}
                        useResizeHandler
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </CardContent>
                </Card>

                {intervalTableRows.length > 0 && (
                  <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between pb-2 bg-gradient-to-r from-primary-50/30 to-accent-teal-50/20 dark:from-primary-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                      <div>
                        <CardTitle>Interval Summary</CardTitle>
                        <CardDescription>
                          Centroid coordinates, point counts, and distance metrics for each metadata
                          interval in chronological order.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowIntervalTable((previous) => !previous)}
                        aria-expanded={showIntervalTable}
                        className="self-stretch sm:self-center"
                      >
                        {showIntervalTable ? (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Hide table
                          </>
                        ) : (
                          <>
                            <ChevronRight className="mr-2 h-4 w-4" />
                            Show table
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    {showIntervalTable ? (
                      <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Rows per page</Label>
                            <Select
                              value={String(intervalPageSize)}
                              onValueChange={(value) => {
                                const size = Number(value);
                                setIntervalPageSize(size);
                                setIntervalPage(1);
                              }}
                            >
                              <SelectTrigger className="h-8 w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[10, 25, 50].map((size) => (
                                  <SelectItem key={size} value={String(size)}>
                                    {size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const rows = intervalTableRows.map((r) => ({
                                  Interval: r.metadata_value,
                                  Type: r.dataset_type,
                                  Points: r.point_count,
                                  'Centroid X': r.centroid?.x,
                                  'Centroid Y': r.centroid?.y,
                                  'Distance G0': r.distance_from_g0,
                                  'Distance Prev': r.distance_from_previous ?? '',
                                }));
                                exportCSV(
                                  rows as any,
                                  Object.keys(rows[0] ?? {}).map((k) => ({ key: k, header: k })),
                                  `interval-summary-${selectedDinsightId ?? 'unknown'}`
                                );
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" /> Export CSV
                            </Button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] table-fixed text-sm">
                            <thead className="text-xs uppercase text-muted-foreground">
                              <tr>
                                <th className="w-32 pb-2 text-left">Interval</th>
                                <th className="w-20 pb-2 text-left">Type</th>
                                <th className="w-20 pb-2 text-right">Points</th>
                                <th className="w-24 pb-2 text-right">Centroid X</th>
                                <th className="w-24 pb-2 text-right">Centroid Y</th>
                                <th className="w-28 pb-2 text-right">Distance G₀</th>
                                <th className="w-28 pb-2 text-right">Distance Prev</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {paginatedIntervalRows.map((interval) => (
                                <tr key={interval.key} className="hover:bg-muted/40">
                                  <td className="py-2 text-left font-medium text-foreground">
                                    {interval.metadata_value}
                                    {interval.is_baseline_cluster && (
                                      <Badge
                                        variant="outline"
                                        className="ml-2 text-[10px] uppercase"
                                      >
                                        G₀
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-2 text-left capitalize text-muted-foreground">
                                    {interval.dataset_type}
                                  </td>
                                  <td className="py-2 text-right">{interval.point_count}</td>
                                  <td className="py-2 text-right">
                                    {formatDecimal(interval.centroid.x)}
                                  </td>
                                  <td className="py-2 text-right">
                                    {formatDecimal(interval.centroid.y)}
                                  </td>
                                  <td className="py-2 text-right">
                                    {formatDecimal(interval.distance_from_g0)}
                                  </td>
                                  <td className="py-2 text-right">
                                    {interval.distance_from_previous != null
                                      ? formatDecimal(interval.distance_from_previous)
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {intervalTableRows.length > intervalPageSize && (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                              Showing {intervalPageStart}-{intervalPageEnd} of{' '}
                              {intervalTableRows.length}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIntervalPage((page) => Math.max(page - 1, 1))}
                                disabled={intervalPage === 1}
                              >
                                Previous
                              </Button>
                              <span className="text-sm font-medium">
                                Page {intervalPage} / {intervalTotalPages}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setIntervalPage((page) => Math.min(page + 1, intervalTotalPages))
                                }
                                disabled={intervalPage === intervalTotalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    ) : (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">
                          Expand to explore per-interval centroid metrics and drift details.
                        </p>
                      </CardContent>
                    )}
                  </Card>
                )}
              </TabsContent>

              {/* Tab 2: Interval Transitions */}
              <TabsContent value="transitions" className="mt-6 space-y-6">
                {/* Transitions Chart */}
                <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                  <CardHeader className="pb-3 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Average Change Between Consecutive {metadataColumn || 'Intervals'}(s)
                      <InfoTooltip title="Understanding This Chart">
                        <p>
                          <strong>Measures stability</strong> — how much the condition changes
                          period-to-period.
                        </p>
                        <p className="mt-2">Large spikes = sudden changes or instability.</p>
                        <p className="mt-2">Consistent low values = stable operation.</p>
                      </InfoTooltip>
                    </CardTitle>
                    <CardDescription>
                      Distance from Gᵢ → Gᵢ₊₁ showing volatility or stability between consecutive
                      intervals.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[500px] p-4">
                    {consecutiveChart ? (
                      <Plot
                        data={consecutiveChart.data}
                        layout={consecutiveChart.layout}
                        config={consecutiveChart.config}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No consecutive transition data available.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {consecutiveRows.length > 0 && (
                  <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
                    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between pb-2 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                      <div>
                        <CardTitle>Consecutive Transition Details</CardTitle>
                        <CardDescription>
                          Inspect transitions that contribute to the Gᵢ → Gᵢ₊₁ distance plot.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTransitionTable((previous) => !previous)}
                        aria-expanded={showTransitionTable}
                        className="self-stretch sm:self-center"
                      >
                        {showTransitionTable ? (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Hide table
                          </>
                        ) : (
                          <>
                            <ChevronRight className="mr-2 h-4 w-4" />
                            Show table
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    {showTransitionTable ? (
                      <CardContent className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Rows per page</Label>
                            <Select
                              value={String(transitionPageSize)}
                              onValueChange={(value) => {
                                const size = Number(value);
                                setTransitionPageSize(size);
                                setTransitionPage(1);
                              }}
                            >
                              <SelectTrigger className="h-8 w-[110px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[10, 25, 50].map((size) => (
                                  <SelectItem key={size} value={String(size)}>
                                    {size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const rows = consecutiveRows.map((r) => ({
                                  From: r.from_label,
                                  To: r.to_label,
                                  Types: `${r.from_dataset_type} → ${r.to_dataset_type}`,
                                  Distance: r.distance,
                                }));
                                exportCSV(
                                  rows as any,
                                  Object.keys(rows[0] ?? {}).map((k) => ({ key: k, header: k })),
                                  `consecutive-transitions-${selectedDinsightId ?? 'unknown'}`
                                );
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" /> Export CSV
                            </Button>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[640px] table-fixed text-sm">
                            <thead className="text-xs uppercase text-muted-foreground">
                              <tr>
                                <th className="w-32 pb-2 text-left">From</th>
                                <th className="w-32 pb-2 text-left">To</th>
                                <th className="w-24 pb-2 text-left">Types</th>
                                <th className="w-28 pb-2 text-right">Distance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {paginatedConsecutiveRows.map((entry, index) => (
                                <tr
                                  key={`${entry.from_label}-${entry.to_label}-${index}`}
                                  className="hover:bg-muted/40"
                                >
                                  <td className="py-2 text-left">{entry.from_label}</td>
                                  <td className="py-2 text-left">{entry.to_label}</td>
                                  <td className="py-2 text-left text-muted-foreground">
                                    {entry.from_dataset_type} → {entry.to_dataset_type}
                                  </td>
                                  <td className="py-2 text-right font-medium text-foreground">
                                    {formatDecimal(entry.distance)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {consecutiveRows.length > transitionPageSize && (
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                              Showing {transitionPageStart}-{transitionPageEnd} of{' '}
                              {consecutiveRows.length}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setTransitionPage((page) => Math.max(page - 1, 1))}
                                disabled={transitionPage === 1}
                              >
                                Previous
                              </Button>
                              <span className="text-sm font-medium">
                                Page {transitionPage} / {transitionTotalPages}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setTransitionPage((page) =>
                                    Math.min(page + 1, transitionTotalPages)
                                  )
                                }
                                disabled={transitionPage === transitionTotalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    ) : (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">
                          Expand to review how consecutive centroid transitions contribute to
                          volatility.
                        </p>
                      </CardContent>
                    )}
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
