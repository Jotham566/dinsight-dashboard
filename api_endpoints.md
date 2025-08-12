# 🔗 API Endpoints Documentation

> **Complete reference for all D'insight API endpoints**  
> **Version**: 2.0.0  
> **Base URL**: `http://localhost:8080/api/v1`  
> **Authentication**: JWT Bearer token (except auth endpoints)

## 📋 Overview

The D'insight API provides comprehensive endpoints for data analytics and anomaly detection, including authentication, data upload/processing, anomaly detection, and real-time monitoring.

## 🔐 Authentication Endpoints

### **POST** `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user"
    }
  }
}
```

### **POST** `/auth/login`
Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "remember_me": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user"
    }
  }
}
```

### **POST** `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

### **POST** `/auth/logout`
**Auth Required**: ✅  
Invalidate user tokens and log out.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### **POST** `/auth/forgot-password`
Initiate password reset process.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### **POST** `/auth/reset-password`
Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## 📊 Core Data Processing Endpoints

### **POST** `/analyze`
**Auth Required**: ✅ (License middleware)  
Upload and process CSV files for analysis.

**Request:** `multipart/form-data`
- **files**: One or more CSV files (max 100MB each)

**Response (200):**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "message": "File(s) uploaded and processing",
    "id": 123
  }
}
```

**Notes:**
- Supports multiple files with matching headers
- Files are automatically merged if multiple
- Processing happens asynchronously
- Returns `file_upload_id` for tracking

### **GET** `/config`
**Auth Required**: ✅ (License middleware)  
Retrieve current processing configuration.

**Response (200):**
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

### **POST** `/config`
**Auth Required**: ✅ (License middleware)  
Update processing configuration parameters.

**Request Body:**
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

**Response (200):**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "id": 1,
    "gamma0": 1e-7,
    "optimizer": "adam",
    "alpha": 0.1,
    "end_meta": "participant",
    "start_dim": "f_0",
    "end_dim": "f_1023"
  }
}
```

---

## 📈 Data Retrieval Endpoints

### **GET** `/dinsight/:id`
**Auth Required**: ✅ (License middleware)  
Get processed dinsight coordinates for visualization.

**Path Parameters:**
- **id**: Dinsight data ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "dinsight_x": [1.234, 2.456, 3.789],
    "dinsight_y": [0.987, 1.543, 2.109]
  }
}
```

### **GET** `/feature/:file_upload_id`
**Auth Required**: ✅ (License middleware)  
Retrieve all feature values for a file upload - used for Feature Analysis visualization.

**Path Parameters:**
- **file_upload_id**: File upload ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "feature_values": [
      [1.234, 2.456, 0.789, 1.567, ...], // Sample 0: f_0, f_1, f_2, f_3, ... f_1023
      [1.345, 2.567, 0.890, 1.678, ...], // Sample 1: f_0, f_1, f_2, f_3, ... f_1023
      [1.456, 2.678, 0.901, 1.789, ...]  // Sample 2: f_0, f_1, f_2, f_3, ... f_1023
    ],
    "total_rows": 1000,
    "metadata": [
      {"segID": "baseline_001", "participant": "P001", "timestamp": "2025-01-01T00:00:00Z"},
      {"segID": "baseline_002", "participant": "P001", "timestamp": "2025-01-01T00:01:00Z"},
      {"segID": "baseline_003", "participant": "P002", "timestamp": "2025-01-01T00:02:00Z"}
    ]
  }
}
```

**Notes:**
- Each array in `feature_values` represents one sample with all its feature values (f_0 to f_1023)
- `metadata` array contains sample-level metadata for identification and labeling
- Used by Feature Analysis page to plot raw feature values across samples
- Metadata helps create meaningful sample labels instead of generic "Sample X" names

### **GET** `/feature/:file_upload_id/range`
**Auth Required**: ✅ (License middleware)  
Retrieve specific range of feature values for performance.

**Path Parameters:**
- **file_upload_id**: File upload ID

**Query Parameters:**
- **start**: Start index (integer)
- **end**: End index (integer)

**Response (200):**
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

---

## 🔍 Monitoring Endpoints

### **POST** `/monitor/:dinsight_id`
**Auth Required**: ✅ (License middleware)  
Upload monitoring data for anomaly detection.

**Path Parameters:**
- **dinsight_id**: Base dinsight data ID

**Request:** `multipart/form-data`
- **file**: CSV file with monitoring data (must have same columns as baseline)

**Response (200):**
```json
{
  "code": 200,
  "message": "Monitoring data processed successfully",
  "data": {
    "id": 456,
    "points_processed": 1000
  }
}
```

### **GET** `/monitor/:dinsight_id`
**Auth Required**: ✅ (License middleware)  
Retrieve monitoring results with metadata.

**Path Parameters:**
- **dinsight_id**: Dinsight data ID

**Response (200):**
```json
[
  {
    "dinsight_x": 1.234,
    "dinsight_y": 0.987,
    "monitor_values": [1.0, 2.0, 3.0],
    "source_file": "monitoring_data.csv",
    "metadata": {"timestamp": "2025-01-01T00:00:00Z"},
    "process_order": 0
  }
]
```

### **GET** `/monitor/:dinsight_id/coordinates`
**Auth Required**: ✅ (License middleware)  
Retrieve only monitoring coordinates for visualization.

**Path Parameters:**
- **dinsight_id**: Dinsight data ID

**Response (200):**
```json
{
  "dinsight_x": [1.234, 2.456, 3.789],
  "dinsight_y": [0.987, 1.543, 2.109]
}
```

---

## 🚨 Anomaly Detection Endpoints

### **POST** `/anomaly/detect`
**Auth Required**: ✅  
Run Mahalanobis Distance-based anomaly detection.

**Request Body:**
```json
{
  "baseline_dataset_id": 123,
  "comparison_dataset_id": 456,
  "sensitivity_factor": 0.8,
  "anomaly_threshold": 2.5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_points": 1000,
    "anomaly_count": 15,
    "anomaly_percentage": 1.5,
    "sensitivity_level": "medium",
    "centroid_distance": 1.85,
    "classification_data": [...],
    "statistics": {
      "mean_distance": 1.42,
      "std_distance": 0.67,
      "max_distance": 4.32
    }
  }
}
```

### **POST** `/anomaly/detect-with-storage`
**Auth Required**: ✅  
Run anomaly detection and store results.

**Request Body:**
```json
{
  "analysis_id": 789,
  "baseline_dataset_id": 123,
  "comparison_dataset_id": 456,
  "sensitivity_factor": 0.8,
  "anomaly_threshold": 2.5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "classification_id": 101,
    "total_points": 1000,
    "anomaly_count": 15,
    "anomaly_percentage": 1.5,
    "alerts_triggered": 2
  }
}
```

### **GET** `/anomaly/threshold/:dataset_id`
**Auth Required**: ✅  
Get adaptive threshold for dataset.

**Path Parameters:**
- **dataset_id**: Dataset ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "recommended_threshold": 2.3,
    "confidence_interval": [1.8, 2.8],
    "data_characteristics": {
      "distribution_type": "normal",
      "outlier_percentage": 0.05
    }
  }
}
```

---

## 🔔 Alert System Endpoints

### **POST** `/alerts/rules`
**Auth Required**: ✅  
Create alert rule.

**Request Body:**
```json
{
  "dataset_id": 123,
  "name": "High Anomaly Alert",
  "description": "Alert when anomaly percentage exceeds threshold",
  "alert_type": "anomaly_detection",
  "anomaly_threshold": 2.5,
  "severity_mapping": {
    "low": {"min": 0, "max": 5},
    "medium": {"min": 5, "max": 15},
    "high": {"min": 15, "max": 100}
  },
  "notification_config": {
    "email": true,
    "webhook_url": "https://hooks.slack.com/..."
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "High Anomaly Alert",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### **GET** `/alerts/rules`
**Auth Required**: ✅  
Get alert rules for user.

**Query Parameters (Optional):**
- **dataset_id**: Filter by dataset ID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "High Anomaly Alert",
      "alert_type": "anomaly_detection",
      "anomaly_threshold": 2.5,
      "is_active": true,
      "dataset": {
        "id": 123,
        "name": "Baseline Dataset"
      }
    }
  ]
}
```

### **GET** `/alerts`
**Auth Required**: ✅  
Get alerts for user.

**Query Parameters (Optional):**
- **status**: Filter by status (active, acknowledged, resolved)
- **severity**: Filter by severity (low, medium, high, critical)
- **dataset_id**: Filter by dataset ID
- **limit**: Number of results (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": 1,
        "title": "High Anomaly Detected",
        "message": "Anomaly percentage (18.5%) exceeded threshold (15%)",
        "severity": "high",
        "status": "active",
        "anomaly_percentage": 18.5,
        "dataset": {
          "id": 123,
          "name": "Baseline Dataset"
        },
        "created_at": "2025-01-01T12:00:00Z"
      }
    ],
    "total": 1,
    "summary": {
      "active": 1,
      "acknowledged": 0,
      "resolved": 0
    }
  }
}
```

### **POST** `/alerts/:id/acknowledge`
**Auth Required**: ✅  
Acknowledge alert.

**Path Parameters:**
- **id**: Alert ID

**Response (200):**
```json
{
  "success": true,
  "message": "Alert acknowledged successfully",
  "data": {
    "id": 1,
    "status": "acknowledged",
    "acknowledged_at": "2025-01-01T12:30:00Z"
  }
}
```

### **POST** `/alerts/:id/resolve`
**Auth Required**: ✅  
Resolve alert.

**Path Parameters:**
- **id**: Alert ID

**Response (200):**
```json
{
  "success": true,
  "message": "Alert resolved successfully",
  "data": {
    "id": 1,
    "status": "resolved",
    "resolved_at": "2025-01-01T12:45:00Z"
  }
}
```

---

## 👤 User Management Endpoints

### **GET** `/users/profile`
**Auth Required**: ✅  
Get user profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "is_active": true,
    "email_verified": true,
    "last_login": "2025-01-01T08:00:00Z",
    "created_at": "2024-12-01T00:00:00Z"
  }
}
```

### **PUT** `/users/profile`
**Auth Required**: ✅  
Update user profile.

**Request Body:**
```json
{
  "full_name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "john.smith@example.com",
    "full_name": "John Smith",
    "updated_at": "2025-01-01T12:00:00Z"
  }
}
```

### **POST** `/users/change-password`
**Auth Required**: ✅  
Change user password.

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 📊 Dataset Management Endpoints

### **POST** `/datasets/metadata`
**Auth Required**: ✅  
Create dataset metadata.

**Request Body:**
```json
{
  "dataset_id": 123,
  "dataset_type": "baseline",
  "name": "Baseline Data - Week 1",
  "description": "Initial baseline measurement",
  "tags": ["baseline", "production", "week1"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "dataset_id": 123,
    "name": "Baseline Data - Week 1",
    "data_quality_score": 95.5,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### **GET** `/datasets/:dataset_id/metadata`
**Auth Required**: ✅  
Get dataset metadata.

**Path Parameters:**
- **dataset_id**: Dataset ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "dataset_id": 123,
    "dataset_type": "baseline",
    "name": "Baseline Data - Week 1",
    "description": "Initial baseline measurement",
    "tags": ["baseline", "production", "week1"],
    "total_records": 1000,
    "valid_records": 955,
    "data_quality_score": 95.5,
    "numeric_summary": {
      "mean": 1.45,
      "std": 0.67,
      "min": 0.12,
      "max": 4.32
    }
  }
}
```

---

## 🔗 Data Lineage Endpoints

### **POST** `/data-lineage`
**Auth Required**: ✅  
Create data lineage record.

**Request Body:**
```json
{
  "source_dataset_id": 123,
  "target_dataset_id": 456,
  "transformation_type": "analysis",
  "process_name": "dinsight_processing",
  "parameters": {
    "gamma0": 1e-7,
    "optimizer": "adam"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "source_dataset_id": 123,
    "target_dataset_id": 456,
    "transformation_type": "analysis",
    "status": "completed",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### **GET** `/datasets/:dataset_id/lineage`
**Auth Required**: ✅  
Get dataset lineage.

**Path Parameters:**
- **dataset_id**: Dataset ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "upstream": [
      {
        "id": 123,
        "name": "Source Data",
        "transformation_type": "upload"
      }
    ],
    "downstream": [
      {
        "id": 789,
        "name": "Monitoring Results",
        "transformation_type": "monitor"
      }
    ]
  }
}
```

---

## 📋 Data Validation Endpoints

### **POST** `/data-validation/rules`
**Auth Required**: ✅  
Create validation rule.

**Request Body:**
```json
{
  "name": "Feature Range Check",
  "description": "Ensure feature values are within expected range",
  "rule_type": "range",
  "field_name": "feature_0",
  "rule_definition": {
    "min_value": 0.0,
    "max_value": 10.0
  },
  "severity": "error"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Feature Range Check",
    "rule_type": "range",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### **POST** `/data-validation/validate`
**Auth Required**: ✅  
Validate dataset.

**Request Body:**
```json
{
  "dataset_id": 123,
  "validation_rule_ids": [1, 2, 3]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "validation_results": [
      {
        "rule_id": 1,
        "status": "passed",
        "records_checked": 1000,
        "records_passed": 1000,
        "records_failed": 0
      }
    ],
    "overall_status": "passed"
  }
}
```

---

## 🔧 Example Dataset Endpoints

### **GET** `/example-datasets/types`
**Auth Required**: ✅  
Get available example dataset types.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "type": "manufacturing_baseline",
      "name": "Manufacturing Baseline",
      "description": "Sample baseline data for analysis",
      "size": "1000 records",
      "features": 1024
    },
    {
      "type": "monitoring_data",
      "name": "Monitoring Data",
      "description": "Sample monitoring data for anomaly detection",
      "size": "500 records",
      "features": 1024
    }
  ]
}
```

### **POST** `/example-datasets/load`
**Auth Required**: ✅  
Load example dataset.

**Request Body:**
```json
{
  "dataset_type": "manufacturing_baseline"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "dataset_id": 999,
    "file_upload_id": 888,
    "name": "Baseline Example Dataset",
    "records_loaded": 1000,
    "processing_status": "completed"
  }
}
```

---

## ⚠️ Error Responses

All endpoints return consistent error responses:

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

### Common Error Codes:
- **400** `VALIDATION_ERROR`: Invalid request data
- **401** `UNAUTHORIZED`: Authentication required
- **403** `FORBIDDEN`: Insufficient permissions
- **404** `NOT_FOUND`: Resource not found
- **409** `CONFLICT`: Resource already exists
- **429** `RATE_LIMITED`: Too many requests
- **500** `INTERNAL_ERROR`: Server error

---

## 🔒 Authentication Requirements

Most endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### License Middleware
Core processing endpoints also require license validation headers (handled automatically by the license middleware).

### Rate Limiting
- **Anonymous**: 10 requests/minute
- **Authenticated**: 100 requests/minute  
- **File uploads**: 10/hour per user

---

## 📝 Notes

1. **Response Consistency**: Some legacy endpoints use different response formats. This will be standardized in future versions.

2. **File Size Limits**: CSV uploads are limited to 100MB per file.

3. **Async Processing**: File analysis happens asynchronously. Use the returned IDs to poll for results.

4. **Data Isolation**: All data is isolated by user. Users can only access their own datasets and analyses.

5. **Permissions**: Role-based access control is enforced at the user level.

6. **Real-time Features**: WebSocket endpoints for real-time monitoring are planned for future versions.
