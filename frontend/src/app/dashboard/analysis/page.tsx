'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import {
  Settings2,
  Play,
  Download,
  TrendingUp,
  Search,
  Settings,
  Eye,
  AlertTriangle,
  Activity,
  BarChart3,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Types
interface Dataset {
  id: number;
  name: string;
  type: 'baseline' | 'monitoring';
  records: number;
  created_at: string;
}

interface AnomalyResult {
  sample_id: string;
  anomaly_score: number;
  mahalanobis_distance: number;
  is_anomaly: boolean;
  contributing_features: string[];
}

interface FeatureImportance {
  feature_name: string;
  importance_score: number;
  percentage: number;
}

// Mock data
const mockDatasets: Dataset[] = [
  {
    id: 1,
    name: 'Baseline Week 1',
    type: 'baseline',
    records: 1000,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    name: 'Monitoring Day 1',
    type: 'monitoring',
    records: 500,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    name: 'Monitoring Day 2',
    type: 'monitoring',
    records: 350,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

const mockAnomalyResults: AnomalyResult[] = [
  {
    sample_id: 'sample_001',
    anomaly_score: 0.95,
    mahalanobis_distance: 3.2,
    is_anomaly: true,
    contributing_features: ['f_245', 'f_156', 'f_789'],
  },
  {
    sample_id: 'sample_042',
    anomaly_score: 0.78,
    mahalanobis_distance: 2.8,
    is_anomaly: true,
    contributing_features: ['f_245', 'f_023'],
  },
  {
    sample_id: 'sample_089',
    anomaly_score: 0.23,
    mahalanobis_distance: 1.1,
    is_anomaly: false,
    contributing_features: [],
  },
];

const mockFeatureImportance: FeatureImportance[] = [
  { feature_name: 'f_245', importance_score: 0.873, percentage: 87.3 },
  { feature_name: 'f_156', importance_score: 0.731, percentage: 73.1 },
  { feature_name: 'f_789', importance_score: 0.658, percentage: 65.8 },
  { feature_name: 'f_023', importance_score: 0.582, percentage: 58.2 },
  { feature_name: 'f_512', importance_score: 0.479, percentage: 47.9 },
];

type DetectionMethod = 'mahalanobis' | 'isolation_forest';

export default function AdvancedAnalysisPage() {
  // State management
  const [baselineDataset, setBaselineDataset] = useState<number>(1);
  const [monitoringDataset, setMonitoringDataset] = useState<number>(2);
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('mahalanobis');
  const [sensitivity, setSensitivity] = useState<number>(80);
  const [threshold, setThreshold] = useState<number>(2.5);
  const [autoAdjustThreshold, setAutoAdjustThreshold] = useState<boolean>(false);
  const [realTimeMonitoring, setRealTimeMonitoring] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Queries
  const {
    data: analysisResults,
    isLoading: analysisLoading,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: ['anomaly-analysis', baselineDataset, monitoringDataset, detectionMethod],
    queryFn: async () => {
      // In real app: await api.analysis.detectAnomalies({...})
      return mockAnomalyResults;
    },
  });

  const { data: featureImportance, isLoading: featureLoading } = useQuery({
    queryKey: ['feature-importance', baselineDataset, monitoringDataset],
    queryFn: async () => {
      // In real app: await api.analysis.getFeatureImportance({...})
      return mockFeatureImportance;
    },
  });

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await refetchAnalysis();
      // Simulate analysis time
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusIcon = (isAnomaly: boolean, score: number) => {
    if (isAnomaly) {
      return score > 0.8 ? (
        <XCircle className="h-5 w-5 text-red-500" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      );
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusColor = (isAnomaly: boolean, score: number) => {
    if (isAnomaly) {
      return score > 0.8
        ? 'text-red-600 bg-red-50 border-red-200'
        : 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
    return 'text-green-600 bg-green-50 border-green-200';
  };

  // Calculate analysis statistics
  const totalSamples = analysisResults?.length || 0;
  const anomalyCount = analysisResults?.filter((r) => r.is_anomaly).length || 0;
  const criticalCount =
    analysisResults?.filter((r) => r.is_anomaly && r.anomaly_score > 0.8).length || 0;
  const anomalyRate = totalSamples > 0 ? ((anomalyCount / totalSamples) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analysis</h1>
          <p className="text-gray-500">Anomaly detection and feature importance analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchAnalysis()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Analysis Area */}
        <div className="xl:col-span-2 space-y-6">
          {/* Anomaly Detection Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Anomaly Detection Settings
              </CardTitle>
              <CardDescription>Configure datasets and detection parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dataset Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Baseline Dataset
                    </label>
                    <select
                      value={baselineDataset}
                      onChange={(e) => setBaselineDataset(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {mockDatasets
                        .filter((d) => d.type === 'baseline')
                        .map((dataset) => (
                          <option key={dataset.id} value={dataset.id}>
                            {dataset.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monitoring Dataset
                    </label>
                    <select
                      value={monitoringDataset}
                      onChange={(e) => setMonitoringDataset(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {mockDatasets
                        .filter((d) => d.type === 'monitoring')
                        .map((dataset) => (
                          <option key={dataset.id} value={dataset.id}>
                            {dataset.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Detection Parameters */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Detection Method
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="mahalanobis"
                          checked={detectionMethod === 'mahalanobis'}
                          onChange={(e) => setDetectionMethod(e.target.value as DetectionMethod)}
                          className="mr-2"
                        />
                        <span className="text-sm">Mahalanobis</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="isolation_forest"
                          checked={detectionMethod === 'isolation_forest'}
                          onChange={(e) => setDetectionMethod(e.target.value as DetectionMethod)}
                          className="mr-2"
                        />
                        <span className="text-sm">Isolation Forest</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sensitivity: {sensitivity}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Threshold: {threshold}
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1.0</span>
                      <span>5.0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoAdjustThreshold}
                      onChange={(e) => setAutoAdjustThreshold(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">Auto-adjust threshold</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={realTimeMonitoring}
                      onChange={(e) => setRealTimeMonitoring(e.target.checked)}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm text-gray-700">Real-time monitoring</span>
                  </label>
                </div>
              </div>

              {/* Run Analysis Button */}
              <div className="mt-6">
                <Button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="w-full md:w-auto"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Anomaly Detection Results</CardTitle>
                <CardDescription>Detailed analysis results for each sample</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {analysisLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-pulse text-center">
                    <div className="h-8 w-8 bg-primary-200 rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading results...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysisResults?.map((result, index) => (
                    <div
                      key={result.sample_id}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        getStatusColor(result.is_anomaly, result.anomaly_score)
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(result.is_anomaly, result.anomaly_score)}
                        <div>
                          <div className="font-medium">{result.sample_id}</div>
                          <div className="text-sm text-gray-600">
                            Score: {result.anomaly_score.toFixed(3)} | Distance:{' '}
                            {result.mahalanobis_distance.toFixed(2)}
                          </div>
                          {result.contributing_features.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Contributing features: {result.contributing_features.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{totalSamples}</div>
                    <div className="text-xs text-blue-700">Total Samples</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-900">{anomalyCount}</div>
                    <div className="text-xs text-red-700">Anomalies</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-900">{criticalCount}</div>
                    <div className="text-xs text-orange-700">Critical</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">{anomalyRate}%</div>
                    <div className="text-xs text-purple-700">Anomaly Rate</div>
                  </div>
                </div>

                {/* Anomaly Rate Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Anomaly Detection Rate</span>
                    <span className="font-medium text-gray-900">{anomalyRate}%</span>
                  </div>
                  <Progress value={parseFloat(anomalyRate)} className="h-2" />
                </div>

                {/* Sensitivity Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Current Sensitivity</span>
                    <span className="font-medium text-gray-900">{sensitivity}%</span>
                  </div>
                  <Progress value={sensitivity} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Importance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Feature Importance</CardTitle>
                <CardDescription>Top contributing features</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {featureLoading ? (
                <div className="space-y-3">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {featureImportance?.map((feature, index) => (
                    <div key={feature.feature_name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-900">{feature.feature_name}</span>
                        <span className="text-gray-600">{feature.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${feature.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Trend Analysis
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Search className="w-4 h-4 mr-2" />
                      Deep Dive
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Settings className="w-4 h-4 mr-2" />
                      Adjust Weights
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" className="justify-start">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Configure Alerts
                </Button>
                <Button variant="outline" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Analysis
                </Button>
                <Button variant="outline" className="justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
