'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Settings2,
  Download,
  RefreshCw,
  Palette,
  BarChart3,
  Camera,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Declare Plotly global for export functionality
declare global {
  interface Window {
    Plotly: any;
  }
}

interface Dataset {
  dinsight_id: number;
  name: string;
  type: 'dinsight';
}

interface CoordinateSeries {
  dinsight_x: number[];
  dinsight_y: number[];
}

// Real data now comes from API endpoints

export default function VisualizationPage() {
  // State management - single dinsight_id for both baseline and monitoring
  const [selectedDinsightId, setSelectedDinsightId] = useState<number | null>(null);
  const [manualDinsightId, setManualDinsightId] = useState<string>('');
  const [pointSize, setPointSize] = useState<number>(12);
  const [showContours, setShowContours] = useState<boolean>(false);
  const [sideBySide, setSideBySide] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [plotElement, setPlotElement] = useState<any>(null);
  const [baselineData, setBaselineData] = useState<CoordinateSeries | null>(null);
  const [isLoadingBaseline, setIsLoadingBaseline] = useState<boolean>(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [monitoringData, setMonitoringData] = useState<CoordinateSeries | null>(null);
  const [isLoadingMonitoring, setIsLoadingMonitoring] = useState<boolean>(false);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [monitoringRefreshKey, setMonitoringRefreshKey] = useState<number>(0);

  // Query for available dinsight datasets
  const {
    data: availableDinsightIds,
    isLoading: datasetsLoading,
    refetch: refetchDinsightIds,
  } = useQuery<Dataset[]>({
    queryKey: ['available-dinsight-ids'],
    refetchOnWindowFocus: true, // Always refetch when window regains focus
    refetchInterval: 30000, // Poll every 30s for new datasets
    staleTime: 10000, // Mark as stale after 10s for quick refresh
    queryFn: async (): Promise<Dataset[]> => {
      // Robust: fetch all available Dinsight IDs by incrementally scanning until N consecutive misses
      const validDatasets: Dataset[] = [];
      const seenDinsightIds = new Set<number>();
      let id = 1;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 5;
      const maxId = 1000; // Safety cap
      while (consecutiveFailures < maxConsecutiveFailures && id <= maxId) {
        try {
          const response = await api.analysis.getDinsight(id);
          const payload = response?.data?.data;
          const resolvedId =
            payload && typeof payload.dinsight_id === 'number' && payload.dinsight_id > 0
              ? payload.dinsight_id
              : id;
          if (
            response.data.success &&
            payload?.dinsight_x &&
            payload?.dinsight_y &&
            Array.isArray(payload.dinsight_x) &&
            Array.isArray(payload.dinsight_y) &&
            payload.dinsight_x.length > 0 &&
            payload.dinsight_y.length > 0
          ) {
            if (!seenDinsightIds.has(resolvedId)) {
              validDatasets.push({
                dinsight_id: resolvedId,
                name: `DInsight ID ${resolvedId}`,
                type: 'dinsight' as const,
              });
              seenDinsightIds.add(resolvedId);
            }
            consecutiveFailures = 0;
          } else {
            consecutiveFailures++;
          }
        } catch (error: any) {
          consecutiveFailures++;
        }
        id++;
      }
      return validDatasets;
    },
  });

  // Auto-select latest (highest ID) available dinsight ID when data loads
  useEffect(() => {
    if (availableDinsightIds && availableDinsightIds.length > 0 && !selectedDinsightId) {
      const latestDataset = availableDinsightIds.reduce((latest, current) =>
        current.dinsight_id > latest.dinsight_id ? current : latest
      );
      setSelectedDinsightId(latestDataset.dinsight_id);
    }
  }, [availableDinsightIds, selectedDinsightId]);

  useEffect(() => {
    if (selectedDinsightId) {
      setManualDinsightId(String(selectedDinsightId));
    } else {
      setManualDinsightId('');
    }
  }, [selectedDinsightId]);

  useEffect(() => {
    if (!selectedDinsightId) {
      setBaselineData(null);
      setBaselineError(null);
      return;
    }

    let isCancelled = false;

    const fetchBaseline = async () => {
      setIsLoadingBaseline(true);
      setBaselineError(null);

      try {
        const response = await api.analysis.getDinsight(selectedDinsightId);
        const payload = response?.data?.data;

        if (!isCancelled) {
          if (
            response?.data?.success &&
            payload?.dinsight_x &&
            payload?.dinsight_y &&
            Array.isArray(payload.dinsight_x) &&
            Array.isArray(payload.dinsight_y) &&
            payload.dinsight_x.length > 0 &&
            payload.dinsight_y.length > 0
          ) {
            setBaselineData({
              dinsight_x: payload.dinsight_x,
              dinsight_y: payload.dinsight_y,
            });
          } else {
            setBaselineData(null);
            setBaselineError('Baseline dataset does not contain valid coordinates yet.');
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.warn(`Failed to fetch baseline dataset ${selectedDinsightId}:`, error);
          const message =
            error?.response?.data?.message || error?.message || 'Unable to load baseline dataset.';
          setBaselineData(null);
          setBaselineError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBaseline(false);
        }
      }
    };

    fetchBaseline();

    return () => {
      isCancelled = true;
    };
  }, [selectedDinsightId, monitoringRefreshKey]);

  useEffect(() => {
    if (!selectedDinsightId) {
      setMonitoringData(null);
      setMonitoringError(null);
      return;
    }

    let isCancelled = false;

    const fetchMonitoring = async () => {
      setIsLoadingMonitoring(true);
      setMonitoringError(null);

      try {
        const response = await api.monitoring.getCoordinates(selectedDinsightId);
        const payload = response?.data;
        const xValues = payload?.dinsight_x;
        const yValues = payload?.dinsight_y;

        if (!isCancelled) {
          if (
            Array.isArray(xValues) &&
            Array.isArray(yValues) &&
            xValues.length > 0 &&
            yValues.length > 0
          ) {
            setMonitoringData({
              dinsight_x: xValues,
              dinsight_y: yValues,
            });
          } else {
            setMonitoringData(null);
            setMonitoringError('Monitoring data not available for this baseline yet.');
          }
        }
      } catch (error: any) {
        if (!isCancelled) {
          console.warn(`Failed to fetch monitoring data for ${selectedDinsightId}:`, error);
          const status = error?.response?.status;
          const message =
            status === 404
              ? 'Monitoring data not found for this baseline. Upload monitoring data to continue.'
              : error?.response?.data?.message ||
                error?.message ||
                'Unable to load monitoring data.';
          setMonitoringData(null);
          setMonitoringError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMonitoring(false);
        }
      }
    };

    fetchMonitoring();

    return () => {
      isCancelled = true;
    };
  }, [selectedDinsightId, monitoringRefreshKey]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleExportPNG = () => {
    if (plotElement && window.Plotly) {
      setNotification({ type: 'success', message: 'Exporting PNG...' });

      window.Plotly.downloadImage(plotElement, {
        format: 'png',
        filename: `dinsight-visualization-${selectedDinsightId || 'export'}-${new Date().toISOString().split('T')[0]}`,
        width: 1200,
        height: 800,
        scale: 2,
      })
        .then(() => {
          setNotification({ type: 'success', message: 'PNG exported successfully!' });
        })
        .catch((error: any) => {
          console.error('Error exporting PNG:', error);
          setNotification({ type: 'error', message: 'Failed to export PNG. Please try again.' });
        });
    } else {
      setNotification({ type: 'error', message: 'Please select a dataset first.' });
    }
  };

  const handleExportSVG = () => {
    if (plotElement && window.Plotly) {
      setNotification({ type: 'success', message: 'Exporting SVG...' });

      window.Plotly.downloadImage(plotElement, {
        format: 'svg',
        filename: `dinsight-visualization-${selectedDinsightId || 'export'}-${new Date().toISOString().split('T')[0]}`,
        width: 1200,
        height: 800,
      })
        .then(() => {
          setNotification({ type: 'success', message: 'SVG exported successfully!' });
        })
        .catch((error: any) => {
          console.error('Error exporting SVG:', error);
          setNotification({ type: 'error', message: 'Failed to export SVG. Please try again.' });
        });
    } else {
      setNotification({ type: 'error', message: 'Please select a dataset first.' });
    }
  };

  const refreshData = () => {
    refetchDinsightIds();
    setMonitoringRefreshKey((prev) => prev + 1);
  };

  const handleManualLoad = () => {
    const trimmedId = manualDinsightId.trim();
    if (!trimmedId) {
      return;
    }

    const parsed = Number(trimmedId);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setBaselineError('Enter a valid DInsight ID.');
      return;
    }

    setBaselineError(null);
    setMonitoringError(null);
    setSelectedDinsightId(parsed);
    setMonitoringRefreshKey((prev) => prev + 1);
    refetchDinsightIds();
  };

  const baselinePointCount =
    baselineData?.dinsight_x?.length && baselineData?.dinsight_y?.length
      ? Math.min(baselineData.dinsight_x.length, baselineData.dinsight_y.length)
      : 0;
  const monitoringPointCount =
    monitoringData?.dinsight_x?.length && monitoringData?.dinsight_y?.length
      ? Math.min(monitoringData.dinsight_x.length, monitoringData.dinsight_y.length)
      : 0;

  const hasBaselineData = baselinePointCount > 0;
  const hasMonitoringData = monitoringPointCount > 0;
  const activeSideBySide = sideBySide && hasMonitoringData;

  const createPlotData = useCallback(() => {
    const data: any[] = [];

    if (hasBaselineData && baselineData) {
      data.push({
        x: baselineData.dinsight_x,
        y: baselineData.dinsight_y,
        mode: 'markers' as const,
        type: 'scattergl' as const,
        name: 'Baseline Dataset',
        marker: {
          color: '#1A73E8',
          size: pointSize,
          opacity: 0.5,
          line: { width: 1, color: 'rgba(0,0,0,0.2)' },
        },
        hovertemplate: '<b>Baseline</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
        ...(activeSideBySide && { xaxis: 'x', yaxis: 'y' }),
      });

      if (showContours && baselineData.dinsight_x.length > 10) {
        data.push({
          x: baselineData.dinsight_x,
          y: baselineData.dinsight_y,
          type: 'histogram2dcontour',
          name: 'Baseline Density',
          showlegend: false,
          colorscale: [
            [0, 'rgba(59, 130, 246, 0)'],
            [1, 'rgba(59, 130, 246, 0.3)'],
          ],
          contours: {
            showlines: false,
          },
          hoverinfo: 'skip',
          ...(activeSideBySide && { xaxis: 'x', yaxis: 'y' }),
        });
      }
    }

    if (hasMonitoringData && monitoringData) {
      data.push({
        x: monitoringData.dinsight_x,
        y: monitoringData.dinsight_y,
        mode: 'markers' as const,
        type: 'scattergl' as const,
        name: 'Monitoring Dataset',
        marker: {
          color: '#EA4335',
          size: pointSize,
          opacity: 0.7,
          line: { width: 1, color: 'rgba(0,0,0,0.2)' },
        },
        hovertemplate: '<b>Monitoring</b><br>X: %{x:.6f}<br>Y: %{y:.6f}<extra></extra>',
        ...(activeSideBySide && { xaxis: 'x2', yaxis: 'y2' }),
      });

      if (showContours && monitoringData.dinsight_x.length > 10) {
        data.push({
          x: monitoringData.dinsight_x,
          y: monitoringData.dinsight_y,
          type: 'histogram2dcontour',
          name: 'Monitoring Density',
          showlegend: false,
          colorscale: [
            [0, 'rgba(239, 68, 68, 0)'],
            [1, 'rgba(239, 68, 68, 0.3)'],
          ],
          contours: {
            showlines: false,
          },
          hoverinfo: 'skip',
          ...(activeSideBySide && { xaxis: 'x2', yaxis: 'y2' }),
        });
      }
    }

    return data;
  }, [
    activeSideBySide,
    baselineData,
    hasBaselineData,
    hasMonitoringData,
    monitoringData,
    pointSize,
    showContours,
  ]);

  const plotLayout = useMemo(() => {
    const baseLayout = {
      title: { text: '' }, // Remove title since we have it in the card header
      showlegend: true,
      hovermode: 'closest' as const,
      plot_bgcolor: 'white',
      paper_bgcolor: 'white',
      font: { family: 'Inter, sans-serif' },
      template: 'plotly_white' as any,
      legend: {
        orientation: 'h' as any,
        yanchor: 'bottom' as any,
        y: 1.02,
        xanchor: 'right' as any,
        x: 1,
      },
      margin: { l: 60, r: 30, t: 30, b: 60 },
    };

    if (activeSideBySide) {
      // Side-by-side subplot configuration
      return {
        ...baseLayout,
        height: 700,
        // Left subplot (Baseline)
        xaxis: {
          title: { text: 'Dinsight X (Baseline)' },
          domain: [0, 0.48],
        },
        yaxis: {
          title: { text: 'Dinsight Y (Baseline)' },
        },
        // Right subplot (Monitoring)
        xaxis2: {
          title: { text: 'Dinsight X (Monitoring)' },
          domain: [0.52, 1],
        },
        yaxis2: {
          title: { text: 'Dinsight Y (Monitoring)' },
          anchor: 'x2' as const,
        },
      };
    } else {
      // Single plot configuration (overlay mode)
      return {
        ...baseLayout,
        xaxis: { title: { text: 'Dinsight X' }, range: [-1, 1] },
        yaxis: { title: { text: 'Dinsight Y' }, range: [-1, 1] },
        height: 700,
      };
    }
  }, [activeSideBySide]);

  const viewDescription = activeSideBySide
    ? 'Side-by-side baseline vs monitoring comparison'
    : hasMonitoringData
      ? 'Overlay comparison with anomaly highlighting'
      : 'Baseline visualization until monitoring data is uploaded';

  const plotConfig = useMemo(
    () => ({
      displayModeBar: true,
      responsive: true,
      // Performance optimization to reduce console warnings about wheel events
      scrollZoom: false, // Disable scroll-based zooming to reduce wheel event listeners
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Modern Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 transform backdrop-blur-sm border ${
            notification.type === 'success'
              ? 'bg-accent-teal-500/90 text-white border-accent-teal-400/20 shadow-accent-teal-500/25'
              : 'bg-red-500/90 text-white border-red-400/20 shadow-red-500/25'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Modern Header with Enhanced Gradient */}
      <div className="sticky top-0 z-10 glass-card backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Data Visualization</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Interactive comparison between baseline and monitoring datasets
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={refreshData}
                className="glass-card hover:shadow-lg transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
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
                    Dinsight ID
                  </label>
                  <select
                    value={selectedDinsightId !== null ? String(selectedDinsightId) : ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === '') {
                        setSelectedDinsightId(null);
                        return;
                      }
                      setSelectedDinsightId(Number(value));
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
                    disabled={datasetsLoading}
                  >
                    {selectedDinsightId === null && <option value="">Select Dataset...</option>}
                    {datasetsLoading ? (
                      <option>Loading datasets...</option>
                    ) : (
                      availableDinsightIds
                        ?.sort((a, b) => b.dinsight_id - a.dinsight_id)
                        ?.map((dataset) => (
                          <option key={dataset.dinsight_id} value={String(dataset.dinsight_id)}>
                            {dataset.name}
                          </option>
                        ))
                    )}
                    {selectedDinsightId !== null &&
                      !datasetsLoading &&
                      !availableDinsightIds?.some(
                        (dataset) => dataset.dinsight_id === selectedDinsightId
                      ) && (
                        <option value={String(selectedDinsightId)}>
                          Dataset ID {selectedDinsightId} (manual entry)
                        </option>
                      )}
                    {!datasetsLoading && availableDinsightIds?.length === 0 && (
                      <option disabled>No data available</option>
                    )}
                  </select>
                </div>
                <div className="glass-card px-4 py-3 bg-gradient-to-r from-primary-100/80 to-accent-teal-100/60 dark:from-primary-900/50 dark:to-accent-teal-900/40 border border-primary-200/50 dark:border-primary-700/50 rounded-xl">
                  <p className="text-xs text-primary-800 dark:text-primary-200 leading-relaxed">
                    {availableDinsightIds && availableDinsightIds.length > 0
                      ? 'Comparing baseline and monitoring coordinates for anomaly detection'
                      : 'Upload baseline data to begin visualization'}
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={manualDinsightId}
                      onChange={(event) =>
                        setManualDinsightId(event.target.value.replace(/[^0-9]/g, ''))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleManualLoad();
                        }
                      }}
                      className="flex-1 min-w-[160px]"
                      placeholder="Enter DInsight ID"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualLoad}
                      className="flex items-center gap-2"
                      disabled={!manualDinsightId || isLoadingBaseline}
                    >
                      Load ID
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshData}
                      className="flex items-center gap-2"
                      disabled={!selectedDinsightId || isLoadingMonitoring}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh Monitoring
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Use a baseline ID from a previous upload to visualize data immediately. Refresh
                    monitoring data after uploading new monitoring files.
                  </p>
                  {selectedDinsightId && (
                    <div
                      className={`p-3 rounded-lg border text-sm ${
                        isLoadingBaseline
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                          : baselineError
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                            : hasBaselineData
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                      }`}
                    >
                      {isLoadingBaseline
                        ? 'Loading baseline coordinates...'
                        : baselineError
                          ? baselineError
                          : hasBaselineData
                            ? `Baseline ready with ${baselinePointCount.toLocaleString()} points.`
                            : 'Baseline coordinates are not available yet. Processing may still be in progress.'}
                    </div>
                  )}
                  {selectedDinsightId && (
                    <div
                      className={`p-3 rounded-lg border text-sm ${
                        isLoadingMonitoring
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                          : monitoringError
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                            : hasMonitoringData
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                      }`}
                    >
                      {isLoadingMonitoring
                        ? 'Loading monitoring data...'
                        : monitoringError
                          ? monitoringError
                          : hasMonitoringData
                            ? `Monitoring ready with ${monitoringPointCount.toLocaleString()} points.`
                            : 'No monitoring points available yet. Upload monitoring data or refresh after processing completes.'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plot Configuration Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-4 bg-gradient-to-r from-accent-purple-50/30 to-accent-pink-50/20 dark:from-accent-purple-950/30 dark:to-accent-pink-950/20 rounded-t-xl">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent-purple-500 to-accent-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple-500/25">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Appearance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Point Size: {pointSize}px
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={pointSize}
                    onChange={(e) => setPointSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((pointSize - 3) / 9) * 100}%, rgb(229, 231, 235) ${((pointSize - 3) / 9) * 100}%, rgb(229, 231, 235) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display Options Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-4 bg-gradient-to-r from-accent-orange-50/30 to-accent-teal-50/20 dark:from-accent-orange-950/30 dark:to-accent-teal-950/20 rounded-t-xl">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent-orange-500 to-accent-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-accent-orange-500/25">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Display</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    {
                      key: 'showContours',
                      label: 'Density Contours',
                      checked: showContours,
                      setter: setShowContours,
                      desc: 'Show data density overlays',
                    },
                    {
                      key: 'sideBySide',
                      label: 'Side-by-Side View',
                      checked: sideBySide,
                      setter: setSideBySide,
                      desc: 'Separate baseline & monitoring',
                    },
                  ].map((option) => (
                    <div
                      key={option.key}
                      className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-150"
                    >
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={option.checked}
                          onChange={(e) => option.setter(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 cursor-pointer">
                          {option.label}
                        </label>
                        <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options Card */}
            <Card className="glass-card shadow-xl border-gray-200/50 dark:border-gray-700/50 card-hover">
              <CardHeader className="pb-4 bg-gradient-to-r from-primary-50/30 to-accent-purple-50/20 dark:from-primary-950/30 dark:to-accent-purple-950/20 rounded-t-xl">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Export</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPNG}
                  className="w-full justify-start glass-card hover:shadow-lg transition-all duration-200"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Export as PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSVG}
                  className="w-full justify-start glass-card hover:shadow-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as SVG
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="xl:col-span-3">
            <Card className="glass-card shadow-2xl border-gray-200/50 dark:border-gray-700/50 min-h-[700px] card-hover">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50/30 via-white/50 to-accent-purple-50/30 dark:from-gray-900/50 dark:via-gray-950/50 dark:to-gray-900/50 backdrop-blur-sm rounded-t-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold gradient-text">
                      Interactive Visualization
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                      {viewDescription}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDinsightId && (
                    <div className="glass-card px-4 py-2 bg-gradient-to-r from-primary-100/80 to-accent-purple-100/60 dark:from-primary-900/50 dark:to-accent-purple-900/40 text-primary-700 dark:text-primary-300 text-sm font-semibold rounded-full border border-primary-200/50 dark:border-primary-700/50">
                      Dataset ID: {selectedDinsightId}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingBaseline ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mx-auto mb-6"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold gradient-text mb-3">Preparing Baseline</h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Loading baseline coordinates for visualization...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-[700px] w-full">
                    {(() => {
                      if (!hasBaselineData) {
                        return (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                                <BarChart3 className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                              </div>
                              <h3 className="text-2xl font-bold gradient-text mb-3">
                                Baseline Not Ready
                              </h3>
                              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                                {baselineError
                                  ? baselineError
                                  : 'Upload or load a baseline dataset to start visualizing your data.'}
                              </p>
                              <Link href="/dashboard/data-summary">
                                <Button className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                                  Upload Data
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      }

                      const plotData = createPlotData();

                      return (
                        <div className="relative h-full w-full bg-white rounded-lg border border-gray-200 dark:border-gray-600 p-2">
                          {!hasMonitoringData && !isLoadingMonitoring && (
                            <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-lg text-sm font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border border-yellow-200/70 dark:border-yellow-800/70 shadow-md">
                              Monitoring data pending. Displaying baseline coordinates only.
                            </div>
                          )}
                          {isLoadingMonitoring && (
                            <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200/70 dark:border-blue-800/70 shadow-md">
                              Loading monitoring coordinates...
                            </div>
                          )}
                          <Plot
                            data={plotData}
                            layout={plotLayout}
                            config={plotConfig}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler={true}
                            onInitialized={(_figure, graphDiv) => {
                              setPlotElement(graphDiv);
                            }}
                            onUpdate={(_figure, graphDiv) => {
                              setPlotElement(graphDiv);
                            }}
                          />
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
