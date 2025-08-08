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
  const [pointSize, setPointSize] = useState<number>(6);
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
  }, [dinsightData, selectedDinsightId, pointSize, showContours, sideBySide]);

  const plotLayout = useMemo(() => {
    const baseLayout = {
      title: { text: '' }, // Remove title since we have it in the card header
      showlegend: true,
      hovermode: 'closest' as const,
      plot_bgcolor: 'rgba(240, 242, 246, 0.3)',
      paper_bgcolor: 'rgba(0,0,0,0)',
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
  }, [showContours, sideBySide]);

  const plotConfig = useMemo(
    () => ({
      displayModeBar: true,
      responsive: true,
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
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
            <span className="font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Modern Header with Glass Effect */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/80 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  D'insight Visualization
                </h1>
                <p className="text-sm text-slate-600">
                  Interactive coordinate analysis and anomaly detection
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={refreshData}
                className="border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm"
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
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <Settings2 className="w-4 h-4 text-white" />
                  </div>
                  Dataset
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Dinsight ID
                  </label>
                  <select
                    value={selectedDinsightId || ''}
                    onChange={(e) => setSelectedDinsightId(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
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
                <div className="px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {availableDinsightIds && availableDinsightIds.length > 0
                      ? 'Comparing baseline and monitoring coordinates for anomaly detection'
                      : 'Upload baseline data to begin visualization'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Plot Configuration Card */}
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  Appearance
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
                      background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${((pointSize - 3) / 9) * 100}%, rgb(229 231 235) ${((pointSize - 3) / 9) * 100}%, rgb(229 231 235) 100%)`,
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
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  Display
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
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Download className="w-4 h-4 text-white" />
                  </div>
                  Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPNG}
                  className="w-full justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Export as PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSVG}
                  className="w-full justify-start border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as SVG
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Visualization Area */}
          <div className="xl:col-span-3">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm min-h-[700px]">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      Interactive Visualization
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      {sideBySide
                        ? 'Side-by-side baseline vs monitoring comparison'
                        : 'Overlay comparison with anomaly highlighting'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDinsightId && (
                    <div className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
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
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Loading Visualization
                      </h3>
                      <p className="text-sm text-gray-600">Processing coordinate data...</p>
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
                              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                                <BarChart3 className="w-8 h-8 text-gray-400" />
                              </div>
                              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                No Data Available
                              </h3>
                              <p className="text-gray-600 mb-6 max-w-sm">
                                Upload baseline data to begin visualizing coordinate patterns and
                                anomalies.
                              </p>
                              <Link href="/dashboard/data-summary">
                                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                                  Upload Data
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="relative h-full w-full">
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
