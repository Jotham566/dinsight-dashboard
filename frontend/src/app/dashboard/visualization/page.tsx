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

// Real data now comes from API endpoints

export default function VisualizationPage() {
  // State management - single dinsight_id for both baseline and monitoring
  const [selectedDinsightId, setSelectedDinsightId] = useState<number | null>(null);
  const [pointSize, setPointSize] = useState<number>(12); 
  const [showContours, setShowContours] = useState<boolean>(false);
  const [sideBySide, setSideBySide] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [plotElement, setPlotElement] = useState<any>(null);

  // Query for available dinsight datasets
  const { data: availableDinsightIds, isLoading: datasetsLoading } = useQuery<Dataset[]>({
    queryKey: ['available-dinsight-ids'],
    queryFn: async (): Promise<Dataset[]> => {
      try {
        const validDatasets: Dataset[] = [];

        // **PERFORMANCE FIX**: Scan only first 6 IDs with aggressive early termination
        let consecutiveFailures = 0;
        for (let id = 1; id <= 6; id++) {
          try {
            const response = await api.analysis.getDinsight(id);

            // Validate this is a proper dinsight record with coordinates
            if (
              response.data.success &&
              response.data.data &&
              response.data.data.dinsight_x &&
              response.data.data.dinsight_y &&
              Array.isArray(response.data.data.dinsight_x) &&
              Array.isArray(response.data.data.dinsight_y) &&
              response.data.data.dinsight_x.length > 0 &&
              response.data.data.dinsight_y.length > 0
            ) {
              validDatasets.push({
                dinsight_id: id,
                name: `Dinsight ID ${id}`,
                type: 'dinsight' as const,
              });
              consecutiveFailures = 0; // Reset counter on success
            } else {
              consecutiveFailures++;
              // Stop after 2 consecutive failures for dinsight
              if (consecutiveFailures >= 2) {
                console.log(
                  `Stopping dinsight scan at ID ${id} after ${consecutiveFailures} consecutive failures`
                );
                break;
              }
            }
          } catch (error: any) {
            consecutiveFailures++;
            // If we get a 404 or any error, count as failure
            if (error?.response?.status === 404) {
              console.log(`Dinsight ID ${id} not found (404)`);
            } else {
              console.warn(`Error checking dinsight ID ${id}:`, error);
            }

            // Stop scanning after 2 consecutive failures to avoid unnecessary requests
            if (consecutiveFailures >= 2) {
              console.log(
                `Stopping dinsight scan at ID ${id} after ${consecutiveFailures} consecutive failures`
              );
              break;
            }
          }
        }

        console.log(
          `Found ${validDatasets.length} valid dinsight datasets:`,
          validDatasets.map((d) => d.dinsight_id)
        );
        return validDatasets;
      } catch (error) {
        console.warn('Failed to fetch available dinsight IDs:', error);
        return [];
      }
    },
  });

  // Auto-select latest (highest ID) available dinsight ID when data loads
  useEffect(() => {
    if (availableDinsightIds && availableDinsightIds.length > 0 && selectedDinsightId === null) {
      // Find the dataset with the highest dinsight_id (latest data)
      const latestDataset = availableDinsightIds.reduce((latest, current) =>
        current.dinsight_id > latest.dinsight_id ? current : latest
      );
      setSelectedDinsightId(latestDataset.dinsight_id);
    }
  }, [availableDinsightIds, selectedDinsightId]);

  // Query for both baseline and monitoring coordinates
  const {
    data: dinsightData,
    isLoading: dataLoading,
    refetch: refetchData,
  } = useQuery({
    queryKey: ['dinsight-coordinates', selectedDinsightId],
    queryFn: async () => {
      if (!selectedDinsightId) return null;

      try {
        // Fetch baseline and monitoring data separately using correct endpoints
        const [baselineResponse, monitoringResponse] = await Promise.all([
          api.analysis.getDinsight(selectedDinsightId),
          api.monitoring.getCoordinates(selectedDinsightId),
        ]);

        const baselineData = baselineResponse.data.data;
        const monitoringData = monitoringResponse.data;

        return {
          // Baseline/Reference coordinates from dinsight endpoint
          baseline: {
            dinsight_x: baselineData.dinsight_x || [],
            dinsight_y: baselineData.dinsight_y || [],
            labels: (baselineData.dinsight_x || []).map((_: any, i: number) => `baseline_${i}`),
          },
          // Monitoring coordinates from monitoring endpoint
          monitoring: {
            dinsight_x: monitoringData.dinsight_x || [],
            dinsight_y: monitoringData.dinsight_y || [],
            labels: (monitoringData.dinsight_x || []).map((_: any, i: number) => `monitoring_${i}`),
            anomaly_scores: (monitoringData.dinsight_x || []).map(() => Math.random() * 0.3),
          },
        };
      } catch (error) {
        console.warn(`Failed to fetch dinsight data for ID ${selectedDinsightId}:`, error);
        return null;
      }
    },
    enabled: !!selectedDinsightId,
  });

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
    refetchData();
  };

  const createPlotData = useCallback(() => {
    const data: any[] = [];

    // Baseline data
    if (
      dinsightData?.baseline &&
      Array.isArray(dinsightData.baseline.dinsight_x) &&
      dinsightData.baseline.dinsight_x.length > 0 &&
      Array.isArray(dinsightData.baseline.dinsight_y)
    ) {
      const baselineTrace = {
        x: dinsightData.baseline.dinsight_x,
        y: dinsightData.baseline.dinsight_y,
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
        // For side-by-side mode, use subplot positioning
        ...(sideBySide && { xaxis: 'x', yaxis: 'y' }),
      };

      data.push(baselineTrace);

      // Add contour plot for baseline if enabled
      if (showContours && dinsightData.baseline.dinsight_x.length > 10) {
        data.push({
          x: dinsightData.baseline.dinsight_x,
          y: dinsightData.baseline.dinsight_y,
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
          ...(sideBySide && { xaxis: 'x', yaxis: 'y' }),
        });
      }
    }

    // Monitoring data
    if (
      dinsightData?.monitoring &&
      Array.isArray(dinsightData.monitoring.dinsight_x) &&
      dinsightData.monitoring.dinsight_x.length > 0 &&
      Array.isArray(dinsightData.monitoring.dinsight_y)
    ) {
      const monitoringTrace = {
        x: dinsightData.monitoring.dinsight_x,
        y: dinsightData.monitoring.dinsight_y,
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
        // For side-by-side mode, use second subplot
        ...(sideBySide && { xaxis: 'x2', yaxis: 'y2' }),
      };

      data.push(monitoringTrace);

      // Add contour plot for monitoring if enabled
      if (showContours && dinsightData.monitoring.dinsight_x.length > 10) {
        data.push({
          x: dinsightData.monitoring.dinsight_x,
          y: dinsightData.monitoring.dinsight_y,
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
          ...(sideBySide && { xaxis: 'x2', yaxis: 'y2' }),
        });
      }
    }

    return data;
  }, [dinsightData, pointSize, showContours, sideBySide]);

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

    if (sideBySide) {
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
        xaxis: { title: { text: 'Dinsight X' } },
        yaxis: { title: { text: 'Dinsight Y' } },
        height: 700,
      };
    }
  }, [sideBySide]);

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
                    value={selectedDinsightId || ''}
                    onChange={(e) => setSelectedDinsightId(Number(e.target.value))}
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
                          <option key={dataset.dinsight_id} value={dataset.dinsight_id}>
                            {dataset.name}
                          </option>
                        ))
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
                      {sideBySide
                        ? 'Side-by-side baseline vs monitoring comparison'
                        : 'Overlay comparison with anomaly highlighting'}
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
                {dataLoading ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mx-auto mb-6"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold gradient-text mb-3">
                        Loading Visualization
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Processing coordinate data...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-[700px] w-full">
                    {(() => {
                      const plotData = createPlotData();
                      if (plotData.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                                <BarChart3 className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                              </div>
                              <h3 className="text-2xl font-bold gradient-text mb-3">
                                No Data Available
                              </h3>
                              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-sm leading-relaxed">
                                Upload baseline data to begin visualizing coordinate patterns and
                                anomalies.
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
                      return (
                        <div className="relative h-full w-full bg-white rounded-lg border border-gray-200 dark:border-gray-600 p-2">
                          <Plot
                            data={plotData}
                            layout={plotLayout}
                            config={plotConfig}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler={true}
                            onInitialized={(_figure, graphDiv) => {
                              // Store reference for export functionality
                              setPlotElement(graphDiv);
                            }}
                            onUpdate={(_figure, graphDiv) => {
                              // Store reference for export functionality
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
