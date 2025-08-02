# Frontend Specification

This is the frontend specification for the spec detailed in @.agent-os/specs/2025-08-01-dinsight-platform-rebuild/spec.md

> Created: 2025-08-01  
> Version: 1.0.0

## Frontend Overview

The Dinsight frontend is a modern, responsive web application built with Next.js 15.4.5, featuring server-side rendering, real-time data visualization, and an intuitive user interface for predictive maintenance analytics.

### Technology Stack
- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript 5.2+
- **Styling**: Tailwind CSS v3.4+ with shadcn/ui components
- **State Management**: React built-in state with custom hooks
- **Charts**: Recharts + D3.js for advanced visualizations
- **Testing**: Jest + React Testing Library + Playwright
- **Build Tool**: Turbopack
- **Package Manager**: npm with workspace support

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication route group
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration page
│   │   ├── forgot-password/      # Password reset
│   │   └── layout.tsx            # Auth layout
│   ├── dashboard/                # Main application
│   │   ├── overview/             # Multi-machine overview dashboard
│   │   ├── organizations/        # Organization management
│   │   │   ├── [id]/            # Organization details
│   │   │   └── create/          # Create organization
│   │   ├── production-lines/     # Production line management
│   │   │   ├── [id]/            # Line details
│   │   │   └── create/          # Create line
│   │   ├── machines/            # Machine management
│   │   │   ├── [id]/            # Machine details
│   │   │   │   ├── analytics/   # Machine analytics
│   │   │   │   ├── monitoring/  # Machine monitoring
│   │   │   │   ├── maintenance/ # Maintenance history
│   │   │   │   └── health/      # Health history
│   │   │   ├── create/          # Add new machine
│   │   │   └── compare/         # Compare machines
│   │   ├── analytics/            # Cross-machine data analysis
│   │   ├── monitoring/           # Fleet monitoring dashboard
│   │   ├── files/               # File management
│   │   ├── maintenance/         # Maintenance management
│   │   ├── settings/            # User settings
│   │   └── layout.tsx           # Dashboard layout
│   ├── admin/                   # Admin-only pages
│   │   ├── users/               # User management
│   │   ├── organizations/       # Organization admin
│   │   ├── machine-types/       # Machine type management
│   │   ├── system/              # System monitoring
│   │   └── layout.tsx           # Admin layout
│   ├── api/                     # API routes (if needed)
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── loading.tsx              # Global loading UI
│   ├── error.tsx                # Global error UI
│   └── not-found.tsx            # 404 page
├── components/                   # Reusable components
│   ├── ui/                      # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── progress.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── features/                # Feature-specific components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── PasswordResetForm.tsx
│   │   ├── organizations/
│   │   │   ├── OrganizationCard.tsx
│   │   │   ├── OrganizationForm.tsx
│   │   │   ├── OrganizationSelector.tsx
│   │   │   └── OrganizationStats.tsx
│   │   ├── production-lines/
│   │   │   ├── ProductionLineCard.tsx
│   │   │   ├── ProductionLineForm.tsx
│   │   │   ├── LineEfficiencyChart.tsx
│   │   │   └── LineStatusIndicator.tsx
│   │   ├── machines/
│   │   │   ├── MachineCard.tsx
│   │   │   ├── MachineForm.tsx
│   │   │   ├── MachineGrid.tsx
│   │   │   ├── MachineSelector.tsx
│   │   │   ├── MachineComparison.tsx
│   │   │   ├── MachineStatusBadge.tsx
│   │   │   ├── MachineHealthGauge.tsx
│   │   │   ├── MachineNavigation.tsx
│   │   │   └── MachineSearch.tsx
│   │   ├── file-upload/
│   │   │   ├── FileUploadZone.tsx
│   │   │   ├── FileList.tsx
│   │   │   ├── UploadProgress.tsx
│   │   │   └── MachineFileUpload.tsx
│   │   ├── charts/
│   │   │   ├── ScatterPlot.tsx
│   │   │   ├── DistributionChart.tsx
│   │   │   ├── AnomalyChart.tsx
│   │   │   ├── RealTimeChart.tsx
│   │   │   ├── MachineComparisonChart.tsx
│   │   │   ├── FleetHealthChart.tsx
│   │   │   ├── MahalanobisChart.tsx
│   │   │   └── TrendAnalysisChart.tsx
│   │   ├── data-table/
│   │   │   ├── DataTable.tsx
│   │   │   ├── TablePagination.tsx
│   │   │   ├── TableFilters.tsx
│   │   │   └── MachineDataTable.tsx
│   │   ├── monitoring/
│   │   │   ├── AlertCard.tsx
│   │   │   ├── MetricsCard.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   ├── FleetOverview.tsx
│   │   │   ├── AnomalyDetectionPanel.tsx
│   │   │   ├── MachineHealthDashboard.tsx
│   │   │   └── RealTimeMonitor.tsx
│   │   ├── maintenance/
│   │   │   ├── MaintenanceSchedule.tsx
│   │   │   ├── MaintenanceLogForm.tsx
│   │   │   ├── MaintenanceHistory.tsx
│   │   │   └── MaintenancePrediction.tsx
│   │   └── analytics/
│   │       ├── AnalysisConfiguration.tsx
│   │       ├── AnomalyDetectionSettings.tsx
│   │       ├── BaselineComparison.tsx
│   │       └── MultiMachineAnalytics.tsx
│   ├── layouts/                 # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── Breadcrumbs.tsx
│   └── common/                  # Common utilities
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── EmptyState.tsx
│       └── ConfirmDialog.tsx
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts              # Authentication hook
│   ├── useApi.ts               # API client hook
│   ├── useFileUpload.ts        # File upload hook
│   ├── useWebSocket.ts         # Real-time updates
│   ├── useLocalStorage.ts      # Local storage hook
│   ├── useDebounce.ts          # Debouncing hook
│   └── useInfiniteScroll.ts    # Infinite scrolling
├── lib/                        # Utility libraries
│   ├── api/                    # API client
│   │   ├── client.ts           # Base API client
│   │   ├── auth.ts             # Auth endpoints
│   │   ├── files.ts            # File endpoints
│   │   ├── analytics.ts        # Analytics endpoints
│   │   └── monitoring.ts       # Monitoring endpoints
│   ├── utils/                  # Helper functions
│   │   ├── cn.ts               # Class name utility
│   │   ├── formatters.ts       # Data formatters
│   │   ├── validators.ts       # Form validators
│   │   ├── constants.ts        # App constants
│   │   └── errors.ts           # Error utilities
│   ├── auth/                   # Authentication logic
│   │   ├── providers.ts        # Auth providers
│   │   ├── middleware.ts       # Auth middleware
│   │   └── guards.ts           # Route guards
│   └── storage/                # Storage utilities
│       ├── local.ts            # Local storage
│       └── session.ts          # Session storage
├── stores/                     # State management
│   ├── authStore.ts            # Authentication state
│   ├── userStore.ts            # User data state
│   ├── fileStore.ts            # File management state
│   └── settingsStore.ts        # App settings state
├── types/                      # TypeScript definitions
│   ├── api.ts                  # API types
│   ├── auth.ts                 # Authentication types
│   ├── file.ts                 # File types
│   ├── analytics.ts            # Analytics types
│   ├── monitoring.ts           # Monitoring types
│   └── common.ts               # Common types
├── styles/                     # Additional styles
│   ├── components.css          # Component styles
│   └── charts.css              # Chart styles
├── public/                     # Static assets
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── tests/                      # Test files
│   ├── __mocks__/              # Test mocks
│   ├── components/             # Component tests
│   ├── hooks/                  # Hook tests
│   ├── pages/                  # Page tests
│   └── e2e/                    # E2E tests
├── docs/                       # Documentation
│   ├── components.md           # Component docs
│   ├── testing.md              # Testing guide
│   └── deployment.md           # Deployment guide
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest configuration
├── playwright.config.ts        # Playwright configuration
├── package.json                # Dependencies
└── README.md                   # Project documentation
```

## TypeScript Type Definitions

The frontend application uses comprehensive TypeScript interfaces that mirror the backend data models and support multi-machine management capabilities:

```typescript
// Organization Management Types
interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  subscriptionTier: 'basic' | 'premium' | 'enterprise';
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  productionLines?: ProductionLine[];
  machines?: Machine[];
  users?: User[];
}

// Production Line Management Types
interface ProductionLine {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  location: string;
  capacity: number;
  operatingHours: string;
  isActive: boolean;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  machines?: Machine[];
}

// Machine Type and Machine Management Types
interface MachineType {
  id: string;
  name: string;
  description?: string;
  manufacturer: string;
  model: string;
  specifications: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Machine {
  id: string;
  organizationId: string;
  productionLineId: string;
  machineTypeId: string;
  name: string;
  serialNumber: string;
  installationDate: string;
  location: string;
  status: 'operational' | 'maintenance' | 'down' | 'offline';
  specifications: Record<string, any>;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
  productionLine?: ProductionLine;
  machineType?: MachineType;
  healthHistory?: MachineHealthHistory[];
  maintenanceLogs?: MaintenanceLog[];
}

// Health Monitoring and Analytics Types
interface MachineHealthHistory {
  id: string;
  machineId: string;
  healthScore: number;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  metrics: Record<string, any>;
  anomaliesDetected: number;
  recordedAt: string;
  machine?: Machine;
}

interface MaintenanceLog {
  id: string;
  machineId: string;
  type: 'scheduled' | 'unscheduled' | 'emergency';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  scheduledDate: string;
  completedDate?: string;
  performedBy?: string;
  cost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  machine?: Machine;
}

// File Management with Machine Association Types
interface FileUpload {
  id: string;
  userId: string;
  organizationId: string;
  machineId?: string;
  filename: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processedAt?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  machine?: Machine;
  organization?: Organization;
}

// Analytics and Data Processing Types
interface DinsightData {
  id: string;
  fileUploadId: string;
  machineId?: string;
  data: Record<string, any>;
  anomalyScore?: number;
  isAnomaly?: boolean;
  features: Record<string, any>;
  processedAt: string;
  createdAt: string;
  fileUpload?: FileUpload;
  machine?: Machine;
}

interface MonitorData {
  id: string;
  machineId?: string;
  sessionId?: string;
  data: Record<string, any>;
  anomalyScore?: number;
  isAnomaly?: boolean;
  timestamp: string;
  createdAt: string;
  machine?: Machine;
}

// User Management with Organization Association
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
}

// API Response and Data Transfer Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Visualization and Chart Data Types
interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

interface AnomalyPoint extends ChartDataPoint {
  isAnomaly: boolean;
  anomalyScore: number;
  machineId?: string;
  timestamp: string;
}

interface MachineComparisonMetrics {
  machineId: string;
  machineName: string;
  organizationName: string;
  productionLineName: string;
  metrics: {
    healthScore: number;
    anomalyCount: number;
    uptimePercentage: number;
    lastMaintenanceDate: string;
    performance: Record<string, number>;
    efficiency: number;
    alertLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

interface FleetHealthSummary {
  totalMachines: number;
  operationalMachines: number;
  maintenanceMachines: number;
  offlineMachines: number;
  averageHealthScore: number;
  criticalAlerts: number;
  upcomingMaintenance: number;
  efficiency: {
    overall: number;
    byProductionLine: Record<string, number>;
  };
}

// Dashboard and UI State Types
interface DashboardFilters {
  organizationId?: string;
  productionLineId?: string;
  machineIds?: string[];
  dateRange: {
    start: string;
    end: string;
  };
  healthScoreRange?: {
    min: number;
    max: number;
  };
  alertLevels?: ('low' | 'medium' | 'high' | 'critical')[];
  statuses?: ('operational' | 'maintenance' | 'down' | 'offline')[];
}

interface MachineComparisonState {
  selectedMachines: string[];
  comparisonType: 'health' | 'performance' | 'anomalies' | 'maintenance' | 'efficiency';
  timeframe: 'day' | 'week' | 'month' | 'quarter' | 'year';
  metrics: string[];
}

interface MultiMachineAnalyticsConfig {
  organizationId?: string;
  productionLineIds?: string[];
  machineIds?: string[];
  analysisType: 'anomaly_detection' | 'performance_comparison' | 'trend_analysis' | 'baseline_comparison';
  timeframe: {
    start: string;
    end: string;
  };
  threshold: number;
  features: string[];
}

// Form and Validation Types
interface OrganizationFormData {
  name: string;
  description?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  subscriptionTier: 'basic' | 'premium' | 'enterprise';
}

interface ProductionLineFormData {
  name: string;
  description?: string;
  location: string;
  capacity: number;
  operatingHours: string;
  isActive: boolean;
}

interface MachineFormData {
  name: string;
  serialNumber: string;
  productionLineId: string;
  machineTypeId: string;
  installationDate: string;
  location: string;
  specifications: Record<string, any>;
}

interface MaintenanceLogFormData {
  machineId: string;
  type: 'scheduled' | 'unscheduled' | 'emergency';
  description: string;
  scheduledDate: string;
  performedBy?: string;
  estimatedCost?: number;
  notes?: string;
}

// Navigation and Route Types
interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavigationItem[];
  permissions?: string[];
}

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

// Real-time Monitoring Types
interface RealTimeUpdate {
  type: 'machine_status' | 'health_score' | 'anomaly_detected' | 'maintenance_alert';
  machineId: string;
  timestamp: string;
  data: Record<string, any>;
}

interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

// Export all types for use across the application
export type {
  Organization,
  ProductionLine,
  MachineType,
  Machine,
  MachineHealthHistory,
  MaintenanceLog,
  FileUpload,
  DinsightData,
  MonitorData,
  User,
  ApiResponse,
  PaginatedResponse,
  ChartDataPoint,
  AnomalyPoint,
  MachineComparisonMetrics,
  FleetHealthSummary,
  DashboardFilters,
  MachineComparisonState,
  MultiMachineAnalyticsConfig,
  OrganizationFormData,
  ProductionLineFormData,
  MachineFormData,
  MaintenanceLogFormData,
  NavigationItem,
  BreadcrumbItem,
  RealTimeUpdate,
  WebSocketMessage
};
```

## Component Architecture

### Design System Approach

#### Base Components (shadcn/ui)
```typescript
// Example: Button component with variants
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
export { Button, buttonVariants }
```

#### Feature Components
```typescript
// Example: File Upload Component
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFileUpload } from '@/hooks/useFileUpload'
import { FileIcon, UploadIcon, XIcon } from 'lucide-react'

interface FileUploadZoneProps {
  onUploadComplete?: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number
  projectName?: string
}

export function FileUploadZone({
  onUploadComplete,
  maxFiles = 5,
  maxSize = 100 * 1024 * 1024, // 100MB
  projectName
}: FileUploadZoneProps) {
  const { uploadFiles, progress, isUploading, error } = useFileUpload()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles].slice(0, maxFiles))
  }, [maxFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize,
    multiple: true
  })

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    
    try {
      const result = await uploadFiles(selectedFiles, { projectName })
      onUploadComplete?.(result)
      setSelectedFiles([])
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Data Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            isUploading && 'pointer-events-none opacity-50'
          )}
        >
          <input {...getInputProps()} />
          <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to select files (CSV, XLS, XLSX)
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Max {maxFiles} files, {Math.round(maxSize / 1024 / 1024)}MB each
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Files</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center space-x-2">
                  <FileIcon className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setSelectedFiles([])}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            Clear
          </Button>
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            Upload Files
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

## Data Visualization Components

### Chart Components with Recharts
```typescript
// Example: Interactive Scatter Plot
'use client'

import { useState, useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DataPoint {
  x: number
  y: number
  id: string
  metadata?: Record<string, any>
  isAnomaly?: boolean
}

interface ScatterPlotProps {
  data: DataPoint[]
  title?: string
  xLabel?: string
  yLabel?: string
  onPointClick?: (point: DataPoint) => void
  showAnomalies?: boolean
  height?: number
}

export function ScatterPlot({
  data,
  title = 'Data Scatter Plot',
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  onPointClick,
  showAnomalies = true,
  height = 400
}: ScatterPlotProps) {
  const [colorBy, setColorBy] = useState<string>('default')
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null)

  const processedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      fill: point.isAnomaly && showAnomalies ? '#ef4444' : '#3b82f6'
    }))
  }, [data, showAnomalies])

  const filteredData = useMemo(() => {
    if (!brushDomain) return processedData
    return processedData.filter(point => 
      point.x >= brushDomain[0] && point.x <= brushDomain[1]
    )
  }, [processedData, brushDomain])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border border-border rounded-md p-3 shadow-md">
          <p className="font-medium">{`Point ID: ${data.id}`}</p>
          <p className="text-sm">{`${xLabel}: ${data.x.toFixed(3)}`}</p>
          <p className="text-sm">{`${yLabel}: ${data.y.toFixed(3)}`}</p>
          {data.isAnomaly && (
            <p className="text-sm text-destructive font-medium">🚨 Anomaly Detected</p>
          )}
          {data.metadata && (
            <div className="mt-2 text-xs text-muted-foreground">
              {Object.entries(data.metadata).map(([key, value]) => (
                <p key={key}>{`${key}: ${value}`}</p>
              ))}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center space-x-2">
          {showAnomalies && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Normal</span>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Anomaly</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBrushDomain(null)}
            disabled={!brushDomain}
          >
            Reset Zoom
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart
            data={filteredData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={xLabel}
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={yLabel}
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => value.toFixed(2)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              dataKey="y"
              fill="#3b82f6"
              onClick={onPointClick}
              cursor="pointer"
            />
            {data.length > 100 && (
              <Brush
                dataKey="x"
                height={30}
                stroke="#8884d8"
                onChange={(domain) => setBrushDomain(domain as [number, number])}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length} points
          {showAnomalies && (
            <span className="ml-4">
              Anomalies: {filteredData.filter(p => p.isAnomaly).length}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

## State Management

### Custom Hooks for State Management
```typescript
// Authentication Hook
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import type { User, LoginCredentials, RegisterData } from '@/types/auth'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  })
  const router = useRouter()

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }

  const setLoading = (isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }))
  }

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await authApi.login(credentials)
      const { user, tokens } = response.data
      
      localStorage.setItem('accessToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false
      }))
      
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || 'Login failed')
      setLoading(false)
    }
  }, [router])

  const register = useCallback(async (data: RegisterData) => {
    try {
      setLoading(true)
      setError(null)
      
      await authApi.register(data)
      
      setLoading(false)
      router.push('/login?message=Please check your email to verify your account')
    } catch (error: any) {
      setError(error.message || 'Registration failed')
      setLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      })
      router.push('/login')
    }
  }, [router])

  const refreshAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('refreshToken')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await authApi.refresh({ refreshToken: token })
      const { accessToken } = response.data
      
      localStorage.setItem('accessToken', accessToken)
      
      // Get user profile
      const userResponse = await authApi.getProfile()
      const user = userResponse.data
      
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false
      }))
    } catch (error) {
      console.error('Auth refresh failed:', error)
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      })
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  return {
    ...state,
    login,
    register,
    logout,
    refreshAuth
  }
}
```

### File Upload Hook
```typescript
// File Upload Hook with Progress
'use client'

import { useState, useCallback } from 'react'
import { filesApi } from '@/lib/api/files'
import type { UploadedFile, UploadOptions } from '@/types/file'

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  uploadedFiles: UploadedFile[]
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFiles: []
  })

  const uploadFiles = useCallback(async (
    files: File[], 
    options?: UploadOptions
  ): Promise<UploadedFile[]> => {
    try {
      setState(prev => ({
        ...prev,
        isUploading: true,
        progress: 0,
        error: null
      }))

      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      if (options?.projectName) {
        formData.append('projectName', options.projectName)
      }
      if (options?.description) {
        formData.append('description', options.description)
      }

      const response = await filesApi.upload(formData, {
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          setState(prev => ({ ...prev, progress }))
        }
      })

      const uploadedFiles = response.data.files
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadedFiles: [...prev.uploadedFiles, ...uploadedFiles]
      }))

      return uploadedFiles
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: error.message || 'Upload failed'
      }))
      throw error
    }
  }, [])

  const clearUploaded = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadedFiles: [],
      error: null
    }))
  }, [])

  return {
    ...state,
    uploadFiles,
    clearUploaded
  }
}
```

## Page Components

### Dashboard Layout
```typescript
// Dashboard Layout Component
'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Header } from '@/components/layouts/Header'
import { Sidebar } from '@/components/layouts/Sidebar'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { redirect } from 'next/navigation'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <div className="flex">
        <Sidebar className="hidden md:block w-64 border-r" />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Analytics Dashboard Page
```typescript
// Analytics Dashboard Page
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUploadZone } from '@/components/features/file-upload/FileUploadZone'
import { ScatterPlot } from '@/components/features/charts/ScatterPlot'
import { DataTable } from '@/components/features/data-table/DataTable'
import { useFiles } from '@/hooks/useFiles'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AnalyticsPage() {
  const { files, isLoading: filesLoading } = useFiles()
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null)
  const { 
    analysisResults, 
    isAnalyzing, 
    startAnalysis, 
    analysisProgress 
  } = useAnalytics()

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(Number(fileId))
  }

  const handleStartAnalysis = async () => {
    if (!selectedFileId) return
    await startAnalysis(selectedFileId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Data Analytics</h1>
        <Button onClick={handleStartAnalysis} disabled={!selectedFileId || isAnalyzing}>
          {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Data</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadZone onUploadComplete={() => window.location.reload()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Dataset</CardTitle>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleFileSelect} disabled={filesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a file to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {files?.map(file => (
                    <SelectItem key={file.id} value={file.id.toString()}>
                      {file.originalFileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {analysisResults ? (
            <Tabs defaultValue="visualization" className="space-y-6">
              <TabsList>
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
                <TabsTrigger value="data">Data Table</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="visualization">
                <ScatterPlot
                  data={analysisResults.coordinates}
                  title="Dimensionality Reduction Results"
                  xLabel="Component 1"
                  yLabel="Component 2"
                />
              </TabsContent>

              <TabsContent value="data">
                <Card>
                  <CardHeader>
                    <CardTitle>Processed Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={analysisResults.rawData}
                      columns={analysisResults.columns}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statistics">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Processing Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {analysisResults.metadata.processingTime}s
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Records Processed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {analysisResults.metadata.recordsProcessed.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Dimensions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {analysisResults.metadata.dimensionsReduced.from} → {analysisResults.metadata.dimensionsReduced.to}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">No Analysis Results</h3>
                  <p className="text-muted-foreground">
                    Upload a file and start analysis to see results here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
```

## Responsive Design Strategy

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

## Performance Optimization

### Code Splitting and Lazy Loading
```typescript
// Lazy loading components
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const ScatterPlot = lazy(() => import('@/components/features/charts/ScatterPlot'))
const DataTable = lazy(() => import('@/components/features/data-table/DataTable'))

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ScatterPlot data={data} />
</Suspense>
```

### Image Optimization
```typescript
// Next.js Image component usage
import Image from 'next/image'

export function UserAvatar({ src, alt, size = 40 }: AvatarProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full"
      priority={false}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Cp5V2d2D4fHr1/9k="
    />
  )
}
```

## Accessibility Implementation

### ARIA Labels and Semantic HTML
```typescript
// Accessible button component
interface AccessibleButtonProps extends ButtonProps {
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-controls'?: string
}

export function AccessibleButton({ 
  children, 
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-expanded': ariaExpanded,
  'aria-controls': ariaControls,
  ...props 
}: AccessibleButtonProps) {
  return (
    <Button
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      {...props}
    >
      {children}
    </Button>
  )
}

// Usage in navigation
<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <AccessibleButton
        aria-label="Dashboard"
        aria-current="page"
      >
        Dashboard
      </AccessibleButton>
    </li>
  </ul>
</nav>
```

### Keyboard Navigation
```typescript
// Keyboard navigation hook
export function useKeyboardNavigation(items: string[], onSelect: (item: string) => void) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => (prev + 1) % items.length)
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
          break
        case 'Enter':
        case ' ':
          event.preventDefault()
          onSelect(items[selectedIndex])
          break
        case 'Escape':
          event.preventDefault()
          setSelectedIndex(0)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedIndex, onSelect])

  return { selectedIndex, setSelectedIndex }
}
```

## Testing Strategy

### Component Testing
```typescript
// Example component test
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadZone } from '@/components/features/file-upload/FileUploadZone'

describe('FileUploadZone', () => {
  const mockOnUploadComplete = jest.fn()

  beforeEach(() => {
    mockOnUploadComplete.mockClear()
  })

  it('renders upload area correctly', () => {
    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} />)
    
    expect(screen.getByText(/drag & drop files here/i)).toBeInTheDocument()
    expect(screen.getByText(/csv, xls, xlsx/i)).toBeInTheDocument()
  })

  it('handles file selection', async () => {
    const user = userEvent.setup()
    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} />)
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' })
    const input = screen.getByRole('textbox', { hidden: true })
    
    await user.upload(input, file)
    
    expect(screen.getByText('test.csv')).toBeInTheDocument()
  })

  it('validates file types', async () => {
    const user = userEvent.setup()
    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} />)
    
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })
    const input = screen.getByRole('textbox', { hidden: true })
    
    await user.upload(input, invalidFile)
    
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
  })
})
```

### E2E Testing with Playwright
```typescript
// Example E2E test
import { test, expect } from '@playwright/test'

test.describe('Analytics Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('complete analytics workflow', async ({ page }) => {
    // Navigate to analytics
    await page.goto('/dashboard/analytics')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('tests/fixtures/sample-data.csv')
    
    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    
    // Select file for analysis
    await page.selectOption('[data-testid="file-select"]', { label: 'sample-data.csv' })
    
    // Start analysis
    await page.click('[data-testid="start-analysis-button"]')
    
    // Wait for analysis to complete
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 30000 })
    
    // Verify scatter plot is displayed
    await expect(page.locator('[data-testid="scatter-plot"]')).toBeVisible()
    
    // Test chart interactions
    await page.hover('[data-testid="data-point-1"]')
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible()
  })

  test('handles analysis errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/analytics')
    
    // Mock API to return error
    await page.route('**/api/v1/analysis/start', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: 'Invalid file format' }
        })
      })
    })
    
    // Attempt analysis
    await page.selectOption('[data-testid="file-select"]', { index: 0 })
    await page.click('[data-testid="start-analysis-button"]')
    
    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid file format')
  })
})
```

## Security Considerations

### Input Validation
```typescript
// Form validation with Zod
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

const fileUploadSchema = z.object({
  projectName: z.string().max(255, 'Project name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional()
})

// Usage in form component
export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    // Handle validated form data
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email')}
        type="email"
        placeholder="Email"
      />
      {errors.email && (
        <span className="text-red-500">{errors.email.message}</span>
      )}
      {/* More form fields */}
    </form>
  )
}
```

### XSS Prevention
```typescript
// Safe HTML rendering with DOMPurify
import DOMPurify from 'dompurify'

interface SafeHTMLProps {
  html: string
  allowedTags?: string[]
}

export function SafeHTML({ html, allowedTags = [] }: SafeHTMLProps) {
  const sanitizedHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['class', 'id']
  })

  return (
    <div
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  )
}
```

---

*This frontend specification provides comprehensive guidance for building a modern, accessible, and performant React application with Next.js, ensuring a high-quality user experience for the Dinsight platform.*
