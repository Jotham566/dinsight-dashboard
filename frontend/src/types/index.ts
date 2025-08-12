// User and Authentication Types
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'viewer';
  is_active?: boolean;
  email_verified?: boolean;
  last_login?: string;
  created_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: User;
  };
}

// Analysis Types
export interface Analysis {
  id: number;
  analysis_type: 'baseline' | 'monitoring';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completed_at?: string;
  created_at: string;
}

// File Upload Types
export interface FileUploadResponse {
  code: number;
  message: string;
  data: {
    message: string;
    id: number;
  };
}

// Configuration Types
export interface ProcessingConfig {
  id?: number;
  gamma0: number;
  optimizer: string;
  alpha: number;
  end_meta: string;
  start_dim: string;
  end_dim: string;
  created_at?: string;
}

// Dinsight Data Types
export interface DinsightData {
  dinsight_x: number[];
  dinsight_y: number[];
}

export interface FeatureData {
  feature_values: number[][];
  total_rows: number;
  metadata?: FeatureMetadata[];
}

export interface FeatureMetadata {
  segID?: string;
  participant?: string;
  timestamp?: string;
  [key: string]: any;
}

// Monitoring Types
export interface MonitoringPoint {
  dinsight_x: number;
  dinsight_y: number;
  monitor_values: number[];
  source_file: string;
  metadata: Record<string, any>;
  process_order: number;
}

// Anomaly Detection Types
export interface AnomalyDetectionRequest {
  baseline_dataset_id: number;
  comparison_dataset_id: number;
  sensitivity_factor: number;
  anomaly_threshold: number;
}

export interface AnomalyDetectionResponse {
  total_points: number;
  anomaly_count: number;
  anomaly_percentage: number;
  sensitivity_level: 'low' | 'medium' | 'high';
  centroid_distance: number;
  classification_data?: any[];
  statistics: {
    mean_distance: number;
    std_distance: number;
    max_distance: number;
  };
}

// Alert Types
export interface Alert {
  id: number;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  anomaly_percentage?: number;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface AlertRule {
  id: number;
  name: string;
  description?: string;
  alert_type: 'anomaly_detection' | 'threshold' | 'pattern';
  anomaly_threshold?: number;
  severity_mapping?: Record<string, { min: number; max: number }>;
  notification_config?: {
    email?: boolean;
    webhook_url?: string;
  };
  is_active: boolean;
  created_at: string;
}

// Dataset Types
export interface DatasetMetadata {
  id: number;
  dataset_id: number;
  dataset_type: 'baseline' | 'monitoring';
  name: string;
  description?: string;
  tags?: string[];
  total_records?: number;
  valid_records?: number;
  data_quality_score?: number;
  numeric_summary?: {
    mean: number;
    std: number;
    min: number;
    max: number;
  };
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  full_name: string;
  agree_terms: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  token: string;
  password: string;
  password_confirmation: string;
}

// Dashboard Types
export interface DashboardStats {
  total_analyses: number;
  system_uptime: number;
  active_alerts: number;
}

export interface RecentAnalysis {
  id: number;
  analysis_type: 'baseline' | 'monitoring' | 'anomaly';
  status: 'completed' | 'processing' | 'failed';
  created_at: string;
}

export interface SystemHealth {
  uptime: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdate: string;
}

// Navigation Types
export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  requiresAuth?: boolean;
  requiredRoles?: Array<'admin' | 'user' | 'viewer'>;
}

// Chart Types
export interface ChartData {
  x: number[];
  y: number[];
  name?: string;
  type?: 'scatter' | 'line' | 'bar';
  mode?: 'lines' | 'markers' | 'lines+markers';
  marker?: {
    color?: string;
    size?: number;
  };
}
