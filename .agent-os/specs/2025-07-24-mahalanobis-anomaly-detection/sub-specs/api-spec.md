# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-24-mahalanobis-anomaly-detection/spec.md

> Created: 2025-07-24  
> Version: 1.0.0

## Endpoints

### POST /api/v1/anomaly/detect

**Purpose:** Perform Mahalanobis distance-based anomaly detection comparing monitoring data against baseline data  
**Parameters:**
- `baseline_dataset_id` (string): ID of the reference/baseline dataset
- `monitoring_dataset_id` (string): ID of the monitoring/comparison dataset  
- `sensitivity_factor` (float): Threshold sensitivity multiplier (default: 3.0, range: 0.1-10.0)

**Request Body:**
```json
{
  "baseline_dataset_id": "uuid-baseline",
  "monitoring_dataset_id": "uuid-monitoring",
  "sensitivity_factor": 3.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "anomaly_results": [
      {
        "point": {"dinsight_x": 1.5, "dinsight_y": 2.3},
        "mahalanobis_distance": 2.45,
        "is_anomaly": false,
        "threshold": 3.21
      }
    ],
    "statistics": {
      "total_points": 1000,
      "anomaly_count": 25,
      "anomaly_percent": 2.5,
      "threshold": 3.21,
      "sensitivity_level": "Medium Sensitivity (standard)"
    },
    "baseline_stats": {
      "centroid": {"dinsight_x": 0.0, "dinsight_y": 0.0},
      "distance_mean": 1.42,
      "distance_std": 0.89,
      "covariance_matrix": [[1.2, 0.3], [0.3, 0.8]]
    }
  }
}
```

**Errors:** 400 (Invalid dataset IDs), 404 (Dataset not found), 422 (Incompatible datasets), 500 (Calculation failed)

### GET /api/v1/anomaly/distance-distribution/{baseline_id}/{monitoring_id}

**Purpose:** Generate distance distribution data for visualization  
**Parameters:**
- `baseline_id` (path): Baseline dataset ID
- `monitoring_id` (path): Monitoring dataset ID
- `sensitivity_factor` (query): Sensitivity factor for threshold calculation (default: 3.0)
- `bins` (query): Number of histogram bins (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "baseline_distribution": {
      "bins": [0.0, 0.5, 1.0, 1.5],
      "counts": [10, 25, 40, 25],
      "density": [0.01, 0.025, 0.04, 0.025]
    },
    "monitoring_distribution": {
      "bins": [0.0, 0.5, 1.0, 1.5],
      "counts": [5, 15, 30, 50],
      "density": [0.005, 0.015, 0.03, 0.05]
    },
    "threshold": 3.21,
    "threshold_line": {
      "x": 3.21,
      "color": "#F39C12",
      "style": "dash"
    }
  }
}
```

### POST /api/v1/anomaly/batch-detect

**Purpose:** Perform anomaly detection on multiple monitoring datasets against a single baseline  
**Parameters:**
- `baseline_dataset_id` (string): Reference dataset ID
- `monitoring_dataset_ids` (array): List of monitoring dataset IDs
- `sensitivity_factor` (float): Threshold sensitivity (default: 3.0)

**Request Body:**
```json
{
  "baseline_dataset_id": "uuid-baseline",
  "monitoring_dataset_ids": ["uuid-mon1", "uuid-mon2", "uuid-mon3"],
  "sensitivity_factor": 2.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "baseline_stats": {...},
    "monitoring_results": {
      "uuid-mon1": {
        "anomaly_results": [...],
        "statistics": {...}
      },
      "uuid-mon2": {
        "anomaly_results": [...],
        "statistics": {...}
      }
    }
  }
}
```

### GET /api/v1/anomaly/sensitivity-analysis/{baseline_id}/{monitoring_id}

**Purpose:** Generate sensitivity analysis showing how threshold changes affect anomaly detection  
**Parameters:**
- `baseline_id` (path): Baseline dataset ID
- `monitoring_id` (path): Monitoring dataset ID
- `factor_min` (query): Minimum sensitivity factor (default: 0.5)
- `factor_max` (query): Maximum sensitivity factor (default: 5.0)
- `steps` (query): Number of analysis steps (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "sensitivity_curve": [
      {
        "sensitivity_factor": 1.0,
        "threshold": 2.31,
        "anomaly_count": 125,
        "anomaly_percent": 12.5,
        "sensitivity_level": "Very High Sensitivity"
      },
      {
        "sensitivity_factor": 3.0,
        "threshold": 3.21,
        "anomaly_count": 25,
        "anomaly_percent": 2.5,
        "sensitivity_level": "Medium Sensitivity (standard)"
      }
    ]
  }
}  
```

### GET /api/v1/anomaly/validate-datasets/{baseline_id}/{monitoring_id}

**Purpose:** Validate dataset compatibility for anomaly detection analysis  
**Parameters:**
- `baseline_id` (path): Baseline dataset ID
- `monitoring_id` (path): Monitoring dataset ID

**Response:**
```json
{
  "success": true,
  "data": {
    "compatible": true,
    "validation_results": {
      "baseline_points": 1000,
      "monitoring_points": 500,
      "covariance_valid": true,
      "sufficient_data": true,
      "data_range_compatible": true
    },
    "warnings": [
      "Monitoring dataset has significantly different scale than baseline"
    ],
    "recommendations": [
      "Consider data normalization if different scales are intentional"
    ]
  }
}
```

## Controllers

### AnomalyDetectionController

**Actions:**
- `DetectAnomalies()` - Core anomaly detection using Mahalanobis distance
- `GetDistanceDistribution()` - Generate histogram data for distance visualization
- `BatchDetectAnomalies()` - Process multiple monitoring datasets against single baseline
- `AnalyzeSensitivity()` - Generate sensitivity analysis curves
- `ValidateDatasets()` - Check dataset compatibility and data quality

**Business Logic:**
- Dataset retrieval and coordinate extraction (dinsight_x, dinsight_y)
- Mahalanobis distance calculation with numerical stability checks
- Adaptive threshold computation based on baseline statistics
- Anomaly classification and percentage reporting
- Statistical validation and compatibility checking

**Error Handling:**
- Dataset access validation and permission checking
- Numerical stability validation (singular matrix detection)
- Data quality validation (minimum points, valid coordinates)
- Sensitivity factor validation and boundary checking
- Graceful handling of calculation failures with detailed error messages

## Mathematical API Details

### Distance Calculation Endpoint Response
The API returns exact distance values as calculated in the Streamlit implementation:

```json
{
  "mahalanobis_distance": 2.4523,
  "calculation_details": {
    "point": [1.5, 2.3],
    "centroid": [0.0, 0.0], 
    "diff_vector": [1.5, 2.3],
    "inv_cov_applied": [1.2, 1.8],
    "final_distance": 2.4523
  }
}
```

### Sensitivity Level Mapping
The API provides human-readable sensitivity descriptions:

- `sensitivity_factor ≤ 1.5`: "Very High Sensitivity (many anomalies likely)"
- `1.5 < sensitivity_factor ≤ 2.5`: "High Sensitivity"  
- `2.5 < sensitivity_factor ≤ 3.5`: "Medium Sensitivity (standard)"
- `sensitivity_factor > 3.5`: "Low Sensitivity (few anomalies likely)"