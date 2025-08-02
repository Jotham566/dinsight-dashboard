# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-01-dinsight-platform-rebuild/spec.md

> Created: 2025-08-01  
> Version: 1.0.0

## API Overview

The Dinsight API provides a comprehensive RESTful interface for predictive maintenance data analysis, featuring user authentication, file processing, monitoring, and analytics capabilities.

### Base Configuration
- **Base URL**: `/api/v1`
- **Content Type**: `application/json`
- **Authentication**: Bearer JWT tokens
- **API Version**: v1
- **Documentation**: Available at `/swagger/*`

## Authentication API

### POST /auth/register
**Purpose**: User registration with email verification  
**Parameters**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```
**Response**:
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "emailVerified": false
  }
}
```
**Errors**: 400 (validation), 409 (user exists)

### POST /auth/login
**Purpose**: User authentication with JWT token generation  
**Parameters**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "analyst"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 3600
    }
  }
}
```
**Errors**: 401 (invalid credentials), 403 (unverified email), 429 (rate limit)

### POST /auth/refresh
**Purpose**: Refresh expired access tokens  
**Parameters**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600
  }
}
```
**Errors**: 401 (invalid refresh token)

### POST /auth/logout
**Purpose**: Invalidate user session and tokens  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/forgot-password
**Purpose**: Initiate password reset process  
**Parameters**:
```json
{
  "email": "user@example.com"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### POST /auth/reset-password
**Purpose**: Complete password reset with token  
**Parameters**:
```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePass123!"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### GET /auth/verify-email
**Purpose**: Verify user email address  
**Query Parameters**: `token` (verification token)  
**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

## Multi-Machine Management API

### Organizations Management

#### GET /organizations
**Purpose**: List user's organizations  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `search` (string, optional)
- `industry` (string, optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": 1,
        "name": "ACME Manufacturing",
        "description": "Leading automotive parts manufacturer",
        "industry": "automotive",
        "country": "USA",
        "timezone": "America/New_York",
        "subscriptionTier": "enterprise",
        "maxMachines": 100,
        "maxUsers": 50,
        "userRole": "admin",
        "machineCount": 45,
        "userCount": 12,
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

#### POST /organizations
**Purpose**: Create new organization  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "name": "ACME Manufacturing",
  "description": "Leading automotive parts manufacturer",
  "industry": "automotive",
  "country": "USA",
  "timezone": "America/New_York",
  "contactInfo": {
    "address": "123 Industrial Blvd",
    "phone": "+1-555-0123",
    "website": "https://acme-mfg.com"
  }
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ACME Manufacturing",
    "subscriptionTier": "basic",
    "maxMachines": 10,
    "maxUsers": 5,
    "userRole": "owner"
  }
}
```

#### GET /organizations/{id}
**Purpose**: Get organization details  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ACME Manufacturing",
    "description": "Leading automotive parts manufacturer",
    "industry": "automotive",
    "settings": {
      "defaultAlertThreshold": 0.85,
      "maintenanceWindowHours": [2, 3, 4],
      "alertNotifications": true
    },
    "statistics": {
      "totalMachines": 45,
      "activeMachines": 43,
      "machinesInMaintenance": 2,
      "totalUsers": 12,
      "avgHealthScore": 87.5,
      "anomaliesLastWeek": 8
    },
    "productionLines": [
      {
        "id": 1,
        "name": "Assembly Line A",
        "machineCount": 15,
        "status": "operational",
        "efficiency": 89.2
      }
    ]
  }
}
```

### Production Lines Management

#### GET /organizations/{orgId}/production-lines
**Purpose**: List production lines in organization  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "productionLines": [
      {
        "id": 1,
        "name": "Assembly Line A",
        "description": "Main assembly line for automotive parts",
        "location": "Building 1, Floor 2",
        "lineType": "assembly",
        "capacityPerHour": 120,
        "currentEfficiency": 89.2,
        "status": "operational",
        "machineCount": 15,
        "activeMachines": 14,
        "supervisor": {
          "id": 5,
          "name": "John Smith",
          "email": "john.smith@acme.com"
        }
      }
    ]
  }
}
```

#### POST /organizations/{orgId}/production-lines
**Purpose**: Create new production line  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "name": "Assembly Line B",
  "description": "Secondary assembly line",
  "location": "Building 1, Floor 3",
  "lineType": "assembly",
  "capacityPerHour": 100,
  "operatingSchedule": {
    "shifts": [
      {"start": "06:00", "end": "14:00", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]},
      {"start": "14:00", "end": "22:00", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]}
    ]
  },
  "supervisorUserId": 5
}
```

### Machine Types Management

#### GET /machine-types
**Purpose**: List available machine types  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `category` (string, optional)
- `manufacturer` (string, optional)
- `search` (string, optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "machineTypes": [
      {
        "id": 1,
        "name": "Industrial Motor Type A",
        "category": "motor",
        "manufacturer": "Siemens",
        "model": "1LA7 090-4AA60",
        "specifications": {
          "power": "2.2 kW",
          "voltage": "400V",
          "rpm": "1400",
          "efficiency": "IE3"
        },
        "defaultParameters": {
          "temperatureRange": {"min": -20, "max": 40},
          "vibrationLimit": 2.5,
          "currentRange": {"min": 2.8, "max": 5.5}
        }
      }
    ]
  }
}
```

### Machines Management

#### GET /organizations/{orgId}/machines
**Purpose**: List machines in organization  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `productionLineId` (integer, optional)
- `machineTypeId` (integer, optional)
- `status` (string, optional)
- `criticality` (string, optional)
- `healthScoreMin` (decimal, optional)
- `healthScoreMax` (decimal, optional)
- `search` (string, optional) - searches name, asset tag, serial number
- `tags` (string[], optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "machines": [
      {
        "id": 1,
        "name": "Motor Assembly Unit 1",
        "assetTag": "MTR-001",
        "serialNumber": "SN123456789",
        "machineType": {
          "id": 1,
          "name": "Industrial Motor Type A",
          "category": "motor"
        },
        "productionLine": {
          "id": 1,
          "name": "Assembly Line A"
        },
        "location": "Station 1A",
        "maintenanceStatus": "operational",
        "healthScore": 87.5,
        "lastMaintenanceDate": "2025-01-15",
        "nextMaintenanceDate": "2025-04-15",
        "criticalityLevel": "high",
        "operatingHours": 2840.5,
        "responsibleTechnician": {
          "id": 8,
          "name": "Mike Johnson",
          "email": "mike.johnson@acme.com"
        },
        "currentMetrics": {
          "temperature": 42.5,
          "vibration": 1.8,
          "efficiency": 89.2,
          "anomalyDetected": false
        },
        "tags": ["critical", "high-priority", "assembly"],
        "baselineEstablished": true,
        "baselineDate": "2025-01-10T10:00:00Z"
      }
    ],
    "summary": {
      "total": 45,
      "operational": 43,
      "maintenance": 2,
      "breakdown": 0,
      "avgHealthScore": 87.5,
      "anomaliesDetected": 3
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### GET /organizations/{orgId}/machines/{id}
**Purpose**: Get detailed machine information  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Motor Assembly Unit 1",
    "assetTag": "MTR-001",
    "serialNumber": "SN123456789",
    "installationDate": "2024-06-15",
    "commissioningDate": "2024-06-20",
    "warrantyExpiry": "2027-06-20",
    "purchaseCost": 15000.00,
    "operatingHours": 2840.5,
    "maintenanceHours": 45.2,
    "specifications": {
      "power": "2.2 kW",
      "voltage": "400V",
      "maxRpm": 1400,
      "weight": "35 kg"
    },
    "monitoringParameters": {
      "temperatureThreshold": 60.0,
      "vibrationThreshold": 2.5,
      "efficiencyThreshold": 85.0,
      "mahalanobisThreshold": 3.0
    },
    "alertThresholds": {
      "temperature": {"warning": 55, "critical": 65},
      "vibration": {"warning": 2.0, "critical": 3.0},
      "efficiency": {"warning": 80, "critical": 75}
    },
    "recentHealthHistory": [
      {
        "healthScore": 87.5,
        "temperature": 42.5,
        "vibration": 1.8,
        "efficiency": 89.2,
        "recordedAt": "2025-08-01T14:30:00Z"
      }
    ],
    "maintenanceSummary": {
      "lastMaintenance": "2025-01-15",
      "nextMaintenance": "2025-04-15",
      "maintenanceCount": 8,
      "avgMaintenanceDuration": 4.2,
      "totalMaintenanceCost": 3500.00
    },
    "anomalyHistory": {
      "last30Days": 2,
      "last7Days": 0,
      "lastDetected": "2025-07-28T09:15:00Z"
    }
  }
}
```

#### POST /organizations/{orgId}/machines
**Purpose**: Register new machine  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "name": "Motor Assembly Unit 5",
  "assetTag": "MTR-005",
  "serialNumber": "SN987654321",
  "productionLineId": 1,
  "machineTypeId": 1,
  "location": "Station 5A",
  "installationDate": "2025-08-01",
  "warrantyExpiry": "2028-08-01",
  "purchaseCost": 16000.00,
  "criticalityLevel": "medium",
  "specifications": {
    "customField1": "value1"
  },
  "monitoringParameters": {
    "temperatureThreshold": 60.0,
    "vibrationThreshold": 2.5
  },
  "responsibleTechnicianId": 8,
  "tags": ["new", "assembly", "motor"]
}
```

#### PUT /organizations/{orgId}/machines/{id}
**Purpose**: Update machine information  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**: Same as POST but all fields optional

#### DELETE /organizations/{orgId}/machines/{id}
**Purpose**: Deactivate/remove machine (soft delete)  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "message": "Machine deactivated successfully"
}
```

### Machine Health Monitoring

#### GET /organizations/{orgId}/machines/{id}/health-history
**Purpose**: Get machine health history  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)
- `limit` (integer, default: 100)
- `includeAnomalies` (boolean, default: false)

**Response**:
```json
{
  "success": true,
  "data": {
    "healthHistory": [
      {
        "healthScore": 87.5,
        "status": "operational",
        "operatingHours": 2840.5,
        "temperature": 42.5,
        "vibration": 1.8,
        "pressure": 2.1,
        "rpm": 1380,
        "currentDraw": 4.2,
        "efficiency": 89.2,
        "anomalyDetected": false,
        "anomalyScore": null,
        "recordedAt": "2025-08-01T14:30:00Z",
        "dataSource": "sensor"
      }
    ],
    "statistics": {
      "avgHealthScore": 87.5,
      "minHealthScore": 82.1,
      "maxHealthScore": 94.3,
      "anomalyCount": 2,
      "dataPoints": 1440
    }
  }
}
```

#### POST /organizations/{orgId}/machines/{id}/health-record
**Purpose**: Record manual health observation  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "healthScore": 85.0,
  "status": "operational",
  "temperature": 45.0,
  "vibration": 2.0,
  "notes": "Routine inspection completed",
  "maintenanceRequired": false
}
```
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
**Errors**: 401 (unauthorized)

### POST /auth/verify-email
**Purpose**: Verify user email address  
**Parameters**:
```json
{
  "token": "email-verification-token"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```
**Errors**: 400 (invalid token), 410 (expired token)

### POST /auth/forgot-password
**Purpose**: Request password reset  
**Parameters**:
```json
{
  "email": "user@example.com"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Password reset instructions sent to email"
}
```
**Errors**: 404 (user not found), 429 (rate limit)

### POST /auth/reset-password
**Purpose**: Reset password with token  
**Parameters**:
```json
{
  "token": "password-reset-token",
  "newPassword": "NewSecurePass123!"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```
**Errors**: 400 (invalid token), 410 (expired token)

## User Management API

### GET /users/profile
**Purpose**: Get current user profile  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "analyst",
    "emailVerified": true,
    "createdAt": "2025-08-01T10:00:00Z",
    "updatedAt": "2025-08-01T10:00:00Z"
  }
}
```
**Errors**: 401 (unauthorized)

### PUT /users/profile
**Purpose**: Update user profile  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "analyst"
  }
}
```
**Errors**: 400 (validation), 401 (unauthorized)

### PUT /users/password
**Purpose**: Change user password  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```
**Errors**: 400 (validation), 401 (unauthorized), 403 (incorrect current password)

## Enhanced Data Management API

### POST /data/upload
**Purpose**: Upload CSV files with metadata and project organization  
**Headers**: `Authorization: Bearer <token>`  
**Content-Type**: `multipart/form-data`  
**Parameters**:
- `files`: CSV files (multiple supported)
- `projectName`: Project name (optional)
- `description`: Description (optional)

**Response**:
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "uploadId": 1,
    "jobId": "job_123",
    "files": [
      {
        "id": 1,
        "originalFileName": "data.csv",
        "fileSize": 1024000,
        "status": "processing"
      }
    ]
  }
}
```
**Errors**: 400 (invalid format), 413 (file too large), 401 (unauthorized)

### GET /data/files
**Purpose**: List user's uploaded files with filtering and pagination  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `projectName`: Filter by project name
- `status`: Filter by status (uploaded, processing, completed, failed)
- `sortBy`: Sort field (createdAt, fileName, fileSize)
- `sortOrder`: Sort order (asc, desc)

**Response**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": 1,
        "originalFileName": "sensor_data.csv",
        "fileSize": 1024000,
        "status": "completed",
        "projectName": "Pump Analysis",
        "description": "Monthly sensor readings",
        "createdAt": "2025-08-01T10:00:00Z",
        "processedAt": "2025-08-01T10:05:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```
**Errors**: 401 (unauthorized)

### GET /data/files/{id}
**Purpose**: Get detailed file information  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "originalFileName": "sensor_data.csv",
    "fileSize": 1024000,
    "status": "completed",
    "projectName": "Pump Analysis",
    "description": "Monthly sensor readings",
    "metadata": {
      "rowCount": 5000,
      "columnCount": 12,
      "columns": ["timestamp", "temperature", "pressure", "vibration"]
    },
    "fileHash": "sha256:abc123...",
    "createdAt": "2025-08-01T10:00:00Z",
    "processedAt": "2025-08-01T10:05:00Z"
  }
}
```
**Errors**: 401 (unauthorized), 404 (file not found)

### DELETE /data/files/{id}
**Purpose**: Delete uploaded file and associated data  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```
**Errors**: 401 (unauthorized), 404 (file not found), 409 (file in use)

### GET /data/projects
**Purpose**: List user's projects  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "projectName": "Pump Analysis",
      "fileCount": 5,
      "totalSize": 5120000,
      "lastUpdated": "2025-08-01T10:00:00Z"
    }
  ]
}
```
**Errors**: 401 (unauthorized)

## Job Processing API

### GET /jobs
**Purpose**: List user's processing jobs  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `status`: Filter by status (pending, running, completed, failed, cancelled)
- `jobType`: Filter by type (analysis, monitoring, export)
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "job_123",
        "userId": 1,
        "fileUploadId": 1,
        "jobType": "analysis",
        "status": "running",
        "progress": 75,
        "startedAt": "2025-08-01T10:00:00Z",
        "estimatedCompletion": "2025-08-01T10:10:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```
**Errors**: 401 (unauthorized)

### GET /jobs/{id}
**Purpose**: Get detailed job information  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": "job_123",
    "userId": 1,
    "fileUploadId": 1,
    "jobType": "analysis",
    "status": "completed",
    "progress": 100,
    "result": {
      "dinsightDataId": 1,
      "processingTime": 120,
      "recordsProcessed": 5000
    },
    "startedAt": "2025-08-01T10:00:00Z",
    "completedAt": "2025-08-01T10:02:00Z",
    "createdAt": "2025-08-01T09:59:00Z"
  }
}
```
**Errors**: 401 (unauthorized), 404 (job not found)

### POST /jobs/{id}/cancel
**Purpose**: Cancel a running job  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```
**Errors**: 401 (unauthorized), 404 (job not found), 409 (job cannot be cancelled)

### GET /jobs/{id}/logs
**Purpose**: Get job execution logs  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-08-01T10:00:00Z",
        "level": "INFO",
        "message": "Starting data processing"
      },
      {
        "timestamp": "2025-08-01T10:01:00Z",
        "level": "INFO",
        "message": "Processed 2500/5000 records"
      }
    ]
  }
}
```
**Errors**: 401 (unauthorized), 404 (job not found)

## Enhanced Analysis API

### POST /analysis/start
**Purpose**: Start analysis with custom configuration  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "fileUploadId": 1,
  "configId": 2,
  "customConfig": {
    "gamma0": 0.5,
    "optimizer": "adam",
    "alpha": 0.01
  }
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_124",
    "estimatedDuration": 180
  }
}
```
**Errors**: 400 (validation), 401 (unauthorized), 404 (file not found)

### GET /analysis/{id}/results
**Purpose**: Get analysis results  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "dinsightDataId": 1,
    "coordinates": {
      "x": [1.2, 2.3, 3.1, ...],
      "y": [0.8, 1.9, 2.1, ...]
    },
    "metadata": {
      "processingTime": 120,
      "recordsProcessed": 5000,
      "dimensionsReduced": {"from": 12, "to": 2}
    },
    "config": {
      "gamma0": 0.5,
      "optimizer": "adam",
      "alpha": 0.01
    }
  }
}
```
**Errors**: 401 (unauthorized), 404 (analysis not found)

### GET /analysis/{id}/export
**Purpose**: Export analysis results  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `format`: Export format (csv, json, xlsx)
- `includeMetadata`: Include metadata (true/false)

**Response**: File download or JSON with download URL
**Errors**: 401 (unauthorized), 404 (analysis not found), 400 (invalid format)

## Enhanced Monitoring API

### POST /monitoring/start
**Purpose**: Start monitoring with baseline comparison  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "baselineDinsightId": 1,
  "monitoringFileId": 2,
  "thresholds": {
    "sensitivity": 0.8,
    "alertLevel": "medium"
  }
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_125",
    "monitoringSessionId": "mon_456"
  }
}
```
**Errors**: 400 (validation), 401 (unauthorized), 404 (baseline not found)

### GET /monitoring/{sessionId}/results
**Purpose**: Get monitoring results with anomaly detection  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "mon_456",
    "anomalies": [
      {
        "id": 1,
        "timestamp": "2025-08-01T10:30:00Z",
        "coordinates": {"x": 4.5, "y": 2.1},
        "distance": 3.2,
        "severity": "high",
        "metadata": {
          "sourceFile": "new_data.csv",
          "recordIndex": 1250
        }
      }
    ],
    "statistics": {
      "totalRecords": 5000,
      "anomalyCount": 23,
      "anomalyRate": 0.46,
      "averageDistance": 1.8
    }
  }
}
```
**Errors**: 401 (unauthorized), 404 (session not found)

### GET /monitoring/{sessionId}/alerts
**Purpose**: Get active monitoring alerts  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": 1,
        "sessionId": "mon_456",
        "type": "high_anomaly_rate",
        "severity": "warning",
        "message": "Anomaly rate exceeded 5% threshold",
        "createdAt": "2025-08-01T10:30:00Z",
        "acknowledged": false
      }
    ]
  }
}
```
**Errors**: 401 (unauthorized), 404 (session not found)

### POST /monitoring/alerts/{id}/acknowledge
**Purpose**: Acknowledge monitoring alert  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "message": "Alert acknowledged"
}
```
**Errors**: 401 (unauthorized), 404 (alert not found)

## Configuration Management API

### GET /config
**Purpose**: Get current user's analysis configuration  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Default Configuration",
    "gamma0": 0.1,
    "optimizer": "adam",
    "alpha": 0.01,
    "endMeta": "auto",
    "startDim": "auto",
    "endDim": "auto",
    "isDefault": true,
    "createdAt": "2025-08-01T10:00:00Z"
  }
}
```
**Errors**: 401 (unauthorized)

### POST /config
**Purpose**: Create or update configuration  
**Headers**: `Authorization: Bearer <token>`  
**Parameters**:
```json
{
  "name": "Custom Analysis Config",
  "gamma0": 0.5,
  "optimizer": "sgd",
  "alpha": 0.005,
  "isDefault": false
}
```
**Response**:
```json
{
  "success": true,
  "message": "Configuration saved successfully",
  "data": {
    "id": 2,
    "name": "Custom Analysis Config"
  }
}
```
**Errors**: 400 (validation), 401 (unauthorized)

### GET /config/templates
**Purpose**: List available configuration templates  
**Headers**: `Authorization: Bearer <token>`  
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "High Sensitivity Analysis",
      "description": "Optimized for detecting subtle anomalies",
      "isPublic": true
    },
    {
      "id": 2,
      "name": "Fast Processing",
      "description": "Optimized for speed over accuracy",
      "isPublic": true
    }
  ]
}
```
**Errors**: 401 (unauthorized)

## System Health API

### GET /health
**Purpose**: Basic health check for load balancers  
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-08-01T10:00:00Z"
}
```
**Errors**: 503 (service unavailable)

### GET /health/detailed
**Purpose**: Detailed system health check  
**Headers**: `Authorization: Bearer <token>` (admin role required)  
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-08-01T10:00:00Z",
  "services": {
    "database": {
      "status": "ok",
      "responseTime": 12,
      "connectionPool": {
        "active": 5,
        "idle": 10,
        "max": 20
      }
    },
    "fileStorage": {
      "status": "ok",
      "freeSpace": "85%"
    },
    "processingQueue": {
      "status": "ok",
      "pendingJobs": 3,
      "runningJobs": 2
    }
  },
  "version": "1.0.0",
  "uptime": 86400
}
```
**Errors**: 401 (unauthorized), 403 (insufficient permissions)

### GET /metrics
**Purpose**: System performance metrics  
**Headers**: `Authorization: Bearer <token>` (admin role required)  
**Response**:
```json
{
  "success": true,
  "data": {
    "requests": {
      "total": 15420,
      "perSecond": 2.3,
      "averageResponseTime": 156
    },
    "errors": {
      "total": 23,
      "rate": 0.15
    },
    "users": {
      "active": 45,
      "registered": 127
    },
    "processing": {
      "jobsCompleted": 1543,
      "averageProcessingTime": 98
    }
  }
}
```
**Errors**: 401 (unauthorized), 403 (insufficient permissions)

## Feature Analysis API

### GET /features/{fileUploadId}
**Purpose**: Get feature values for uploaded file  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `page`: Page number for pagination
- `limit`: Items per page
- `features`: Comma-separated list of specific features

**Response**:
```json
{
  "success": true,
  "data": {
    "fileUploadId": 1,
    "sourceFileName": "sensor_data.csv",
    "features": [
      {
        "name": "temperature",
        "values": [23.5, 24.1, 23.8, ...],
        "statistics": {
          "mean": 23.8,
          "std": 0.8,
          "min": 22.1,
          "max": 25.4
        }
      }
    ],
    "metadata": {
      "recordCount": 5000,
      "samplingRate": 1.0
    }
  }
}
```
**Errors**: 401 (unauthorized), 404 (file not found)

### GET /features/{fileUploadId}/range
**Purpose**: Get feature values within specific range  
**Headers**: `Authorization: Bearer <token>`  
**Query Parameters**:
- `startIndex`: Start index (default: 0)
- `endIndex`: End index
- `features`: Specific features to retrieve

**Response**:
```json
{
  "success": true,
  "data": {
    "startIndex": 0,
    "endIndex": 1000,
    "features": [
      {
        "name": "temperature",
        "values": [23.5, 24.1, 23.8, ...]
      }
    ]
  }
}
```
**Errors**: 401 (unauthorized), 404 (file not found), 400 (invalid range)

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided data is invalid",
    "details": [
      {
        "field": "email",
        "message": "Email format is invalid"
      }
    ],
    "timestamp": "2025-08-01T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (resource already exists)
- **413**: Payload Too Large
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error
- **503**: Service Unavailable

## Rate Limiting

### Authentication Endpoints
- Login: 5 requests per minute per IP
- Register: 3 requests per minute per IP
- Password reset: 2 requests per minute per IP

### General API Endpoints
- 100 requests per minute per authenticated user
- 20 requests per minute for unauthenticated requests

### File Upload Endpoints
- 10 uploads per hour per user
- Maximum file size: 100MB per file
- Maximum 5 files per upload request

---

*This API specification provides comprehensive documentation for all endpoints in the Dinsight platform, enabling both frontend development and third-party integrations.*
