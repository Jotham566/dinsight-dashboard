# 🔧 API Specification

> **Version**: 2.0.0  
> **Status**: In Development  
> **Base URL**: `/api/v1`

## 📋 Overview

The DInsight API provides endpoints for data analytics, including data upload, processing, visualization, and anomaly detection. This specification documents both existing endpoints and planned enhancements.

## 🏗️ Architecture

- **Framework**: Go + Gin
- **Database**: PostgreSQL
- **Authentication**: JWT (to be implemented)
- **Documentation**: OpenAPI/Swagger
- **License**: Custom license middleware (applied to ALL endpoints)
- **CORS**: Configured to allow all origins

## ⚠️ Important Notes

### Response Format Inconsistency
The API currently uses different response formats across endpoints:
- Some return `{"success": true, "data": {...}}`
- Others return `{"code": 200, "message": "Success", "data": {...}}`
- Monitor coordinates endpoint returns data directly without wrapper

### Middleware Requirements
- **License Middleware**: ALL endpoints require valid license headers
- **CORS**: Enabled for cross-origin requests
- **File Size Limits**: 100MB maximum per file upload

## 📍 Current Endpoints

### File Upload & Analysis

#### `POST /api/v1/analyze`
Upload and process CSV files for analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Body: One or more CSV files
- Max file size: 100MB per file

**Response:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "message": "File(s) uploaded and processing",
    "id": 1
  }
}
```

**Notes:**
- Supports single or multiple CSV files
- Multiple files must have matching headers (automatically validated)
- Multiple files are automatically merged during processing
- Processing happens asynchronously in background
- Returns file_upload ID for tracking

### Configuration Management

#### `GET /api/v1/config`
Retrieve current processing configuration.

**Response:**
```json
{
  "data": {
    "id": 1,
    "gamma0": 1e-7,
    "optimizer": "adam",
    "alpha": 0.1,
    "end_meta": "participant",
    "start_dim": "f_0",
    "end_dim": "f_1023",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### `POST /api/v1/config`
Update processing configuration parameters.

**Editable Parameters:**
```json
{
  "gamma0": 1e-7,
  "optimizer": "adam",
  "alpha": 0.1,
  "end_meta": "participant",
  "start_dim": "f_0",
  "end_dim": "f_1023"
}
```

**Parameter Details:**
- `gamma0`: float64 (default: 1e-7) - General gamma parameter
- `optimizer`: string (default: "adam") - Optimizer choice  
- `alpha`: float64 (default: 0.1) - Alpha parameter
- `end_meta`: string (default: "participant") - End metadata field name
- `start_dim`: string (default: "f_0") - Starting dimension field name
- `end_dim`: string (default: "f_1023") - Ending dimension field name

### Data Retrieval

#### `GET /api/v1/dinsight/:id`
Get processed dinsight coordinates.

**Response:**
```json
{
  "success": true,
  "data": {
    "dinsight_x": [1.2, 3.4, 5.6],
    "dinsight_y": [2.1, 4.3, 6.5]
  }
}
```

#### `GET /api/v1/feature/:file_upload_id`
Retrieve all feature values for a file upload.

**Response:**
```json
{
  "success": true,
  "data": {
    "feature_values": [
      [1.0, 2.0, 3.0],
      [4.0, 5.0, 6.0]
    ],
    "total_rows": 2
  }
}
```

#### `GET /api/v1/feature/:file_upload_id/range`
Retrieve specific range of feature values for performance optimization.

**Query Parameters:**
- `start` (int) - Start index
- `end` (int) - End index

**Response:**
```json
{
  "success": true,
  "data": {
    "feature_values": [1.0, 2.0, 3.0, 4.0],
    "total_values": 1000,
    "range": {
      "start": 10,
      "end": 13
    }
  }
}
```

### Monitoring

#### `POST /api/v1/monitor/:dinsight_id`
Upload monitoring data for anomaly detection.

**Request:**
- Content-Type: `multipart/form-data`
- Body: CSV file with monitoring data

#### `GET /api/v1/monitor/:dinsight_id`
Retrieve monitoring results with metadata.

**Response:**
```json
[
  {
    "dinsight_x": 1.2,
    "dinsight_y": 3.4,
    "monitor_values": [1.0, 2.0, 3.0],
    "source_file": "data.csv",
    "metadata": {},
    "process_order": 0
  }
]
```

#### `GET /api/v1/monitor/:dinsight_id/coordinates`
Retrieve only monitoring coordinates for visualization.

**Response:**
```json
{
  "dinsight_x": [1.2, 3.4, 5.6],
  "dinsight_y": [2.1, 4.3, 6.5]
}
```

## 🚀 Planned Endpoints

### Authentication & User Management

#### `POST /api/v1/auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

#### `POST /api/v1/auth/login`
Authenticate user and receive JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_jwt",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  }
}
```

#### `POST /api/v1/auth/refresh`
Refresh access token using refresh token.

#### `POST /api/v1/auth/logout`
Invalidate user tokens.

#### `POST /api/v1/auth/forgot-password`
Initiate password reset process.

#### `POST /api/v1/auth/reset-password`
Reset password with token.

### Dataset Management

#### `GET /api/v1/datasets`
List user's datasets.

#### `POST /api/v1/datasets`
Create new dataset.

**Request:**
```json
{
  "name": "Production Data Q1",
  "description": "First quarter production analytics data",
  "tags": ["production", "q1-2025"],
  "metadata": {}
}
```

#### `GET /api/v1/datasets/:id`
Get dataset details.

#### `PUT /api/v1/datasets/:id`
Update dataset information.

#### `DELETE /api/v1/datasets/:id`
Delete dataset and associated analyses.

### Advanced Analytics

#### `POST /api/v1/analytics/anomaly-detection`
Run Mahalanobis Distance-based anomaly detection.

**Request:**
```json
{
  "baseline_data_id": "uuid",
  "monitoring_data_id": "uuid",
  "threshold": 2.5,
  "sensitivity": 0.8,
  "detection_method": "mahalanobis"
}
```

**Response:**
```json
{
  "anomalies": [
    {
      "timestamp": "2025-01-01T12:00:00Z",
      "distance": 3.2,
      "severity": "high",
      "features": ["f_temperature", "f_pressure"],
      "confidence": 0.95
    }
  ],
  "summary": {
    "total_points": 1000,
    "anomalies_detected": 15,
    "average_distance": 1.8
  }
}
```

#### `GET /api/v1/analytics/thresholds/:dataset_id`
Get adaptive thresholds for dataset.

#### `POST /api/v1/analytics/thresholds/:dataset_id`
Update anomaly detection thresholds.

### Alerts & Notifications

#### `GET /api/v1/alerts`
List alerts for user's datasets.

#### `POST /api/v1/alerts/rules`
Create alert rule.

**Request:**
```json
{
  "dataset_id": "uuid",
  "condition": {
    "metric": "anomaly_score",
    "operator": "greater_than",
    "value": 2.5
  },
  "actions": ["email", "webhook"],
  "severity": "critical"
}
```

#### `GET /api/v1/alerts/:id`
Get alert details.

#### `PUT /api/v1/alerts/:id/acknowledge`
Acknowledge alert.

### Data Export & Reports

#### `GET /api/v1/export/analysis/:id`
Export analysis results in various formats.

**Query Parameters:**
- `format`: csv, json, excel
- `include`: coordinates, features, anomalies

#### `POST /api/v1/reports/generate`
Generate analysis report.

**Request:**
```json
{
  "dataset_id": "uuid",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "sections": ["summary", "anomalies", "trends", "recommendations"]
}
```

## 🔐 Authentication

All endpoints (except auth endpoints) require JWT authentication:

```
Authorization: Bearer <jwt_token>
```

## 🛡️ Rate Limiting

- Anonymous: 10 requests/minute
- Authenticated: 100 requests/minute
- File uploads: 10/hour

## ⚠️ Error Responses

Standard error format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

Error codes:
- `VALIDATION_ERROR`: 400
- `UNAUTHORIZED`: 401
- `FORBIDDEN`: 403
- `NOT_FOUND`: 404
- `RATE_LIMITED`: 429
- `INTERNAL_ERROR`: 500

## 📊 Websocket Endpoints (Planned)

### Real-time Monitoring
`ws://api/v1/ws/monitor/:dataset_id`

Receive real-time updates for dataset monitoring.

### Alert Stream
`ws://api/v1/ws/alerts`

Stream real-time alerts for user's datasets.