# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-24-interactive-visualization-engine/spec.md

> Created: 2025-07-24  
> Version: 1.0.0

## Endpoints

### GET /api/v1/charts/scatter

**Purpose:** Generate scatter plot data for single or multiple datasets  
**Parameters:** 
- `dataset_ids` (array): List of dataset IDs to include in the chart
- `color_scheme` (string): Color scheme identifier (default, custom, etc.)
- `point_size` (int): Size of scatter points (default: 6)
- `point_opacity` (float): Opacity of points 0-1 (default: 0.7)
- `show_contours` (bool): Include density contours (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "chart_type": "scatter",
    "datasets": [...],
    "layout": {...},
    "config": {...}
  }
}
```

**Errors:** 400 (Invalid dataset IDs), 404 (Dataset not found), 500 (Chart generation failed)

### GET /api/v1/charts/side-by-side

**Purpose:** Generate side-by-side comparison plots in grid layout  
**Parameters:**
- `dataset_ids` (array): List of dataset IDs for comparison
- `grid_cols` (int): Number of columns in grid (max 3, default: 3)
- `point_size` (int): Size of scatter points (default: 6)
- `point_opacity` (float): Opacity of points (default: 0.7)

**Response:**
```json
{
  "success": true,
  "data": {
    "chart_type": "subplot_grid",
    "subplots": [...],
    "grid_layout": {"rows": 2, "cols": 3}
  }
}
```

**Errors:** 400 (Invalid parameters), 413 (Too many datasets)

### GET /api/v1/charts/anomaly-detection

**Purpose:** Generate anomaly detection visualization comparing baseline to monitoring data  
**Parameters:**
- `baseline_id` (string): Baseline dataset ID
- `monitoring_id` (string): Monitoring dataset ID  
- `threshold` (float): Anomaly detection threshold
- `sensitivity_factor` (float): Sensitivity multiplier (default: 3.0)

**Response:**
```json
{
  "success": true,
  "data": {
    "chart_type": "anomaly_detection",
    "baseline_data": {...},
    "monitoring_data": {...},
    "anomaly_stats": {
      "total_points": 1000,
      "anomaly_count": 25,
      "anomaly_percent": 2.5
    }
  }
}
```

**Errors:** 400 (Invalid IDs), 422 (Incompatible datasets)

### POST /api/v1/charts/config

**Purpose:** Save user chart configuration preferences  
**Parameters:**
- `config_name` (string): Configuration identifier
- `settings` (object): Chart configuration settings

**Request Body:**
```json
{
  "config_name": "my_default_scatter",
  "settings": {
    "color_scheme": "blue_orange",
    "point_size": 8,
    "point_opacity": 0.8,
    "show_grid": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "config_id": "uuid",
    "message": "Configuration saved"
  }
}
```

### GET /api/v1/charts/config/{config_id}

**Purpose:** Retrieve saved chart configuration  
**Parameters:** None (config_id in URL path)

**Response:**
```json
{
  "success": true,
  "data": {
    "config_name": "my_default_scatter",
    "settings": {...},
    "created_at": "2025-07-24T10:00:00Z"
  }
}
```

### POST /api/v1/charts/export

**Purpose:** Export chart data in specified format  
**Parameters:**
- `chart_data` (object): Chart data to export
- `format` (string): Export format (png, svg, pdf)
- `width` (int): Output width in pixels (default: 1200)
- `height` (int): Output height in pixels (default: 700)

**Response:** Binary file download or base64 encoded data

### WebSocket: /ws/charts/live-updates

**Purpose:** Real-time chart updates via WebSocket connection  
**Authentication:** JWT token or session-based auth required

**Message Types:**
```json
// Subscribe to dataset updates
{
  "type": "subscribe",
  "dataset_ids": ["uuid1", "uuid2"]
}

// Chart data update notification
{
  "type": "chart_update",
  "dataset_id": "uuid",
  "chart_data": {...}
}

// Connection status
{
  "type": "status",
  "connected": true,
  "subscriptions": ["uuid1", "uuid2"]
}
```

## Controllers

### ChartController

**Actions:**
- `GenerateScatterChart()` - Process scatter plot requests and return chart data
- `GenerateSideBySideChart()` - Create comparative grid visualizations
- `GenerateAnomalyChart()` - Process anomaly detection visualization requests
- `SaveChartConfig()` - Persist user chart configuration preferences
- `LoadChartConfig()` - Retrieve saved chart configurations
- `ExportChart()` - Generate chart exports in various formats

**Business Logic:**
- Dataset validation and access control
- Chart data transformation and optimization
- Configuration persistence and retrieval
- Real-time update coordination

**Error Handling:**
- Dataset not found or access denied errors
- Invalid parameter validation with detailed field errors
- Chart generation failures with fallback options
- Export processing errors with retry mechanisms

### WebSocketController

**Actions:**
- `HandleConnection()` - Manage WebSocket connection lifecycle
- `HandleSubscription()` - Process dataset subscription requests
- `BroadcastUpdate()` - Send chart updates to subscribed clients
- `HandleDisconnection()` - Clean up subscriptions on disconnect

**Business Logic:**
- Connection authentication and authorization
- Subscription management and cleanup
- Message routing and broadcasting
- Connection state tracking and recovery