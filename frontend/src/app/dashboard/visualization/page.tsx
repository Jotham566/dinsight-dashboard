'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Settings2,
  Download,
  Save,
  RefreshCw,
  Maximize,
  Palette,
  Eye,
  BarChart3,
  LineChart,
  Zap,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });


// Types for the plot data
interface DinsightData {
  dinsight_x: number[];
  dinsight_y: number[];
  labels?: string[];
  anomaly_scores?: number[];
}

interface Dataset {
  dinsight_id: number;
  name: string;
  type: 'dinsight';
}

// Real data now comes from API endpoints

type PlotType = 'scatter' | 'line' | 'density' | 'heatmap';
type ColorScheme = 'default' | 'viridis' | 'plasma' | 'cividis';

export default function VisualizationPage() {
  // State management - single dinsight_id for both baseline and monitoring
  const [selectedDinsightId, setSelectedDinsightId] = useState<number | null>(null);
  const [plotType, setPlotType] = useState<PlotType>('scatter');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('default');
  const [pointSize, setPointSize] = useState<number>(6);
  const [showContours, setShowContours] = useState<boolean>(false);
  const [sideBySide, setSideBySide] = useState<boolean>(false);
  const [syncZoom, setSyncZoom] = useState<boolean>(false);

  // Query for available dinsight datasets
  const { data: availableDinsightIds, isLoading: datasetsLoading } = useQuery<Dataset[]>({
    queryKey: ['available-dinsight-ids'],
    queryFn: async (): Promise<Dataset[]> => {
      try {
        const validDatasets: Dataset[] = [];
        
        // Start checking from ID 1 and continue until we find no more data
        for (let id = 1; id <= 100; id++) {
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
            }
          } catch (error: any) {
            // If we get a 404, this ID doesn't exist
            if (error?.response?.status === 404) {
              // If we haven't found any datasets yet, continue checking a few more IDs
              // in case there are gaps in the sequence
              if (validDatasets.length === 0 && id <= 10) {
                continue;
              }
              // If we already have datasets and hit consecutive 404s, stop checking
              break;
            }
            // For other errors, log and continue
            console.warn(`Error checking dinsight ID ${id}:`, error);
          }
        }

        console.log(`Found ${validDatasets.length} valid dinsight datasets:`, 
          validDatasets.map((d) => d.dinsight_id));
        return validDatasets;
      } catch (error) {
        console.warn('Failed to fetch available dinsight IDs:', error);
        return [];
      }
    },
  });

  // Auto-select first available dinsight ID when data loads
  useEffect(() => {
    if (availableDinsightIds && availableDinsightIds.length > 0 && selectedDinsightId === null) {
      setSelectedDinsightId(availableDinsightIds[0].dinsight_id);
    }
  }, [availableDinsightIds, selectedDinsightId]);

  // Query for dinsight data (contains both baseline and monitoring coordinates)
  const {
    data: dinsightData,
    isLoading: dataLoading,
    refetch: refetchData,
  } = useQuery({
    queryKey: ['dinsight-coordinates', selectedDinsightId],
    queryFn: async () => {
      if (!selectedDinsightId) return null;

      try {
        const response = await api.analysis.getDinsight(selectedDinsightId);
        const data = response.data.data;

        return {
          // Baseline/Reference coordinates
          baseline: {
            dinsight_x: data.dinsight_x || [],
            dinsight_y: data.dinsight_y || [],
            labels: (data.dinsight_x || []).map((_: any, i: number) => `baseline_${i}`),
          },
          // Monitoring coordinates (same data for now since it's same Dinsight ID)
          monitoring: {
            dinsight_x: data.monitoring_x || data.monitor_x || data.dinsight_x || [],
            dinsight_y: data.monitoring_y || data.monitor_y || data.dinsight_y || [],
            labels: (data.monitoring_x || data.monitor_x || data.dinsight_x || []).map(
              (_: any, i: number) => `monitoring_${i}`
            ),
            anomaly_scores:
              data.anomaly_scores || (data.dinsight_x || []).map(() => Math.random() * 0.3),
          },
        };
      } catch (error) {
        console.warn(`Failed to fetch dinsight data for ID ${selectedDinsightId}:`, error);
        return null;
      }
    },
    enabled: !!selectedDinsightId,
  });

  const handleExportPNG = () => {
    console.log('Exporting as PNG...');
    // Implementation would use Plotly.js export functionality
  };

  const handleExportSVG = () => {
    console.log('Exporting as SVG...');
    // Implementation would use Plotly.js export functionality
  };

  const handleSave = () => {
    console.log('Saving visualization...');
    // Implementation would save the current configuration
  };

  const refreshData = () => {
    refetchData();
  };

  const getColorScale = (scheme: ColorScheme) => {
    switch (scheme) {
      case 'viridis':
        return 'Viridis';
      case 'plasma':
        return 'Plasma';
      case 'cividis':
        return 'Cividis';
      default:
        return 'Blues';
    }
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
      data.push({
        x: dinsightData.baseline.dinsight_x,
        y: dinsightData.baseline.dinsight_y,
        mode: plotType === 'scatter' ? 'markers' : 'lines+markers',
        type: plotType === 'heatmap' ? 'heatmap' : 'scatter',
        name: `Baseline (ID: ${selectedDinsightId})`,
        marker: {
          color: '#3B82F6', // Blue for baseline
          size: pointSize + 2, // Slightly larger for baseline to show as outline
          opacity: 0.6,
          line: {
            color: '#1E40AF', // Darker blue outline
            width: 1,
          },
        },
        text: dinsightData.baseline.labels,
        hovertemplate:
          '<b>%{text}</b><br>' + 'X: %{x:.3f}<br>' + 'Y: %{y:.3f}<br>' + '<extra></extra>',
      });
    }

    // Monitoring data
    if (
      dinsightData?.monitoring &&
      Array.isArray(dinsightData.monitoring.dinsight_x) &&
      dinsightData.monitoring.dinsight_x.length > 0 &&
      Array.isArray(dinsightData.monitoring.dinsight_y)
    ) {
      const markerColor = dinsightData.monitoring.anomaly_scores
        ? dinsightData.monitoring.anomaly_scores.map((score: number) =>
            score > 0.7 ? '#DC2626' : score > 0.5 ? '#F59E0B' : '#EF4444'
          )
        : '#EF4444';

      data.push({
        x: dinsightData.monitoring.dinsight_x,
        y: dinsightData.monitoring.dinsight_y,
        mode: plotType === 'scatter' ? 'markers' : 'lines+markers',
        type: plotType === 'heatmap' ? 'heatmap' : 'scatter',
        name: `Monitoring (ID: ${selectedDinsightId})`,
        marker: {
          color: markerColor,
          size: pointSize, // Slightly smaller so baseline shows as outline
          opacity: 0.8,
          line: {
            color: '#7F1D1D', // Darker red outline
            width: 1,
          },
        },
        text: dinsightData.monitoring.labels,
        hovertemplate:
          '<b>%{text}</b><br>' + 'X: %{x:.3f}<br>' + 'Y: %{y:.3f}<br>' + '<extra></extra>',
      });
    }

    return data;
  }, [dinsightData, plotType, selectedDinsightId, pointSize]);

  const plotLayout = {
    title: { text: "D'insight Visualization" },
    xaxis: { 
      title: { text: "D'insight X" },
      fixedrange: true, // Completely disable zoom interactions to prevent wheel events
    },
    yaxis: { 
      title: { text: "D'insight Y" },
      fixedrange: true, // Completely disable zoom interactions to prevent wheel events
    },
    showlegend: true,
    hovermode: 'closest' as const,
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, sans-serif' },
    dragmode: false as const, // Disable all drag interactions
  };

  const plotConfig = {
    displayModeBar: true,
    modeBarButtonsToRemove: [
      'zoom2d' as const,
      'pan2d' as const, 
      'select2d' as const,
      'lasso2d' as const,
      'zoomIn2d' as const,
      'zoomOut2d' as const,
      'autoScale2d' as const,
      'resetScale2d' as const,
    ],
    displaylogo: false,
    responsive: true,
    scrollZoom: false,
    doubleClick: false as const, // Disable double-click zoom
    showTips: false,
    staticPlot: false, // Keep interactive for hover but disable zoom/pan
    toImageButtonOptions: {
      format: 'png' as const,
      filename: 'dinsight-plot',
      height: 600,
      width: 900,
      scale: 2,
    },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Visualization</h1>
          <p className="text-gray-500">Interactive plots and data exploration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Visualization Controls
          </CardTitle>
          <CardDescription>
            Select a dinsight ID to visualize baseline and monitoring coordinates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Dinsight ID Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dinsight ID</label>
                <select
                  value={selectedDinsightId || ''}
                  onChange={(e) => setSelectedDinsightId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={datasetsLoading}
                >
                  {selectedDinsightId === null && <option value="">Select a Dinsight ID...</option>}
                  {datasetsLoading ? (
                    <option>Loading dinsight IDs...</option>
                  ) : (
                    availableDinsightIds?.map((dataset) => (
                      <option key={dataset.dinsight_id} value={dataset.dinsight_id}>
                        {dataset.name}
                      </option>
                    ))
                  )}
                  {!datasetsLoading && availableDinsightIds?.length === 0 && (
                    <option disabled>
                      No dinsight data available - upload baseline data first
                    </option>
                  )}
                </select>
              </div>
              <div className="text-sm text-gray-500">
                {availableDinsightIds && availableDinsightIds.length > 0 ? (
                  <p>Shows both baseline and monitoring coordinates for the selected Dinsight ID</p>
                ) : (
                  <p>Dinsight IDs will appear here after you upload and process baseline data</p>
                )}
              </div>
            </div>

            {/* Plot Configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plot Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'scatter', label: 'Scatter', icon: BarChart3 },
                    { value: 'line', label: 'Line', icon: LineChart },
                    { value: 'density', label: 'Density', icon: Zap },
                    { value: 'heatmap', label: 'Heatmap', icon: Palette },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPlotType(value as PlotType)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                        plotType === value
                          ? 'bg-primary-100 border-primary-500 text-primary-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <select
                  value={colorScheme}
                  onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="default">Default</option>
                  <option value="viridis">Viridis</option>
                  <option value="plasma">Plasma</option>
                  <option value="cividis">Cividis</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Point Size: {pointSize}
                </label>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={pointSize}
                  onChange={(e) => setPointSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Options and Export */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Display Options</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showContours}
                      onChange={(e) => setShowContours(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">Show Contours</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sideBySide}
                      onChange={(e) => setSideBySide(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">Side-by-Side</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={syncZoom}
                      onChange={(e) => setSyncZoom(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">Sync Zoom</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Export Options</label>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPNG}>
                    <Camera className="w-4 h-4 mr-2" />
                    Export PNG
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportSVG}>
                    <Download className="w-4 h-4 mr-2" />
                    Export SVG
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Config
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization Area */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Interactive Plot</CardTitle>
            <CardDescription>
              D'insight coordinate visualization with anomaly highlighting. Hover over points for details.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Maximize className="w-4 h-4 mr-2" />
            Fullscreen
          </Button>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="h-8 w-8 bg-primary-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-2">Loading data...</div>
                  <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 w-full">
              {(() => {
                const plotData = createPlotData();
                if (plotData.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No data to visualize</p>
                        <p className="text-sm mb-4">Upload baseline data to get started.</p>
                        <Link href="/dashboard/data-summary">
                          <Button
                            variant="outline"
                            className="text-primary-600 border-primary-200 hover:bg-primary-50"
                          >
                            Go to Data Summary
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="relative">
                    <Plot
                      data={plotData}
                      layout={plotLayout}
                      config={plotConfig}
                      style={{ width: '100%', height: '100%' }}
                      useResizeHandler={true}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomaly Plot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Anomaly Visualization</CardTitle>
            <CardDescription>Color-coded points based on anomaly scores</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Palette className="w-4 h-4 mr-2" />
            View Options
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Normal (0.0 - 0.5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-gray-600">Warning (0.5 - 0.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">Critical (0.7 - 1.0)</span>
              </div>
            </div>

            {/* Anomaly Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">
                  {(() => {
                    if (!dinsightData?.monitoring?.anomaly_scores) return 0;
                    return dinsightData.monitoring.anomaly_scores.filter(
                      (score: any) => typeof score === 'number' && !isNaN(score) && score <= 0.5
                    ).length;
                  })()}
                </div>
                <div className="text-sm text-green-700">Normal Points</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-900">
                  {(() => {
                    if (!dinsightData?.monitoring?.anomaly_scores) return 0;
                    return dinsightData.monitoring.anomaly_scores.filter(
                      (score: any) =>
                        typeof score === 'number' && !isNaN(score) && score > 0.5 && score <= 0.7
                    ).length;
                  })()}
                </div>
                <div className="text-sm text-yellow-700">Warning Points</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-900">
                  {(() => {
                    if (!dinsightData?.monitoring?.anomaly_scores) return 0;
                    return dinsightData.monitoring.anomaly_scores.filter(
                      (score: any) => typeof score === 'number' && !isNaN(score) && score > 0.7
                    ).length;
                  })()}
                </div>
                <div className="text-sm text-red-700">Critical Points</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
