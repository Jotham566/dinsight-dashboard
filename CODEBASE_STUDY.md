# 🔬 Dinsight Dashboard - Comprehensive Codebase Study

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Backend API Structure](#backend-api-structure)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Data Flow](#data-flow)
7. [Coordinate Generation](#coordinate-generation)
8. [Feature Data & Metadata Handling](#feature-data--metadata-handling)
9. [Frontend Structure](#frontend-structure)
10. [Key Processing Pipelines](#key-processing-pipelines)

---

## Project Overview

**Dinsight Dashboard** is a comprehensive data analytics platform specializing in:
- **Dimensionality Reduction**: Converting high-dimensional CSV data into 2D coordinates for visualization
- **Anomaly Detection**: Identifying outliers using Mahalanobis Distance
- **Real-time Monitoring**: Streaming and monitoring data points against baseline datasets
- **User Management**: JWT-based authentication and role-based access control

### Technology Stack
- **Backend**: Go (1.23.2+) with Gin framework, GORM ORM
- **Frontend**: Next.js 15+ with TypeScript, Tailwind CSS, React Query
- **Database**: PostgreSQL 14+ with JSONB support
- **Security**: Custom JWT license verification, device registration

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                             │
│         Port 3000 - TypeScript, Tailwind CSS, React             │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP REST API
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Backend API (Go/Gin)                            │
│         Port 8080 - License Middleware, JWT Auth                │
│  ┌──────────────────┬──────────────────┬──────────────────┐     │
│  │   Auth Routes    │  Analysis Routes │  Monitor Routes  │     │
│  │  /auth/*         │   /analyze       │  /monitor/*      │     │
│  │  /refresh        │   /dinsight/*    │  /streaming/*    │     │
│  └──────────────────┴──────────────────┴──────────────────┘     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Internal Handlers & Business Logic              │   │
│  │  - Upload Handler (file processing)                     │   │
│  │  - Processor (dimensionality reduction)                 │   │
│  │  - Monitor Handler (coordinate generation)              │   │
│  │  - Feature Handler (metadata management)                │   │
│  │  - Anomaly Handler (detection)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────────┘
                        │ GORM ORM
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                             │
│  ┌────────────────┬────────────────┬────────────────┐           │
│  │  FileUpload    │  DinsightData  │  FeatureData   │           │
│  │  MonitorData   │  ConfigData    │  User Tables   │           │
│  │  StreamingConf │  Analysis      │  Metadata      │           │
│  └────────────────┴────────────────┴────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend API Structure

### Directory Structure
```
Dinsight_API/
├── cmd/
│   ├── api/main.go              # Entry point, server initialization
│   └── migrate/main.go          # Database migration tool
├── config/
│   └── config.go                # Database & app configuration
├── internal/
│   ├── routes/routes.go         # API route definitions
│   ├── handler/                 # HTTP handlers for each endpoint
│   │   ├── upload.go            # File upload & processing
│   │   ├── monitor.go           # Monitoring coordinates
│   │   ├── feature.go           # Feature data retrieval
│   │   ├── dinsight.go          # Baseline data retrieval
│   │   ├── anomaly.go           # Anomaly detection
│   │   ├── streaming.go         # Real-time streaming
│   │   ├── auth.go              # Authentication
│   │   ├── user.go              # User management
│   │   └── ...
│   ├── processor/               # Data processing logic
│   │   ├── processor.go         # Main processing pipeline
│   │   ├── distance.go          # Distance calculations
│   │   └── functions.go         # Mathematical functions
│   ├── dinsightmon/             # Monitoring algorithms
│   │   ├── monitor.go           # Monitor processing
│   │   ├── distanceFuncLib/     # Distance functions
│   │   └── funcLib/             # Utility functions
│   ├── database/                # Database layer
│   │   ├── database.go          # DB connection
│   │   ├── migrations.go        # Schema migrations
│   │   └── init_test_data.go    # Test data initialization
│   ├── model/models.go          # Data models (GORM)
│   ├── middleware/auth.go       # JWT authentication
│   └── response/helpers.go      # Response formatting
├── middleware/
│   └── license.go               # License verification
├── pkg/
│   ├── license/                 # License management
│   │   ├── license.go           # License validation (RSA)
│   │   ├── device.go            # Device registration
│   │   └── middleware.go        # License middleware
│   └── response/                # Response utilities
└── go.mod / go.sum             # Dependencies

```

### Server Initialization (`main.go`)
```go
// 1. Initialize Database
dbConfig := config.NewDatabaseConfig()
database.InitDB(dbConfig)
database.RunMigrations()

// 2. Initialize License System
licenseManager := license.NewLicenseVerifier("public.pem")
deviceManager := license.NewDeviceManager("devices.json")
claims := licenseManager.LoadLicense("license.lic")
deviceManager.RegisterDevice(claims.MaxDevices)

// 3. Setup Routes with Middleware
routes.SetupRoutes(r, licenseManager, deviceManager)

// 4. Start Server
r.Run(":8080")
```

---

## Database Models

### Core Models (`internal/model/models.go`)

#### 1. **FileUpload** - Tracks uploaded files
```go
type FileUpload struct {
    ID               uint
    OriginalFileName string
    FileSize         int64
    Status           string          // "uploading", "processing", "completed", "failed"
    ErrorMessage     string
    IsMerged         bool
    MergedFiles      pq.StringArray  // Array of filenames if merged
    CreatedAt        time.Time
}
```
- **Purpose**: Track file upload status and metadata
- **Status Flow**: `uploading` → `processing` → `completed` / `failed`

#### 2. **DinsightData** - Stores 2D coordinates from dimensionality reduction
```go
type DinsightData struct {
    ID           uint
    FileUploadID uint            // FK to FileUpload
    ConfigID     uint            // FK to ConfigData
    DinsightX    pq.Float64Array // X coordinates (baseline)
    DinsightY    pq.Float64Array // Y coordinates (baseline)
    SourceFiles  pq.StringArray  // Source CSV files
}
```
- **Purpose**: Store baseline 2D coordinates after processing
- **Size**: Arrays contain one entry per row in original CSV
- **Key Relationship**: One-to-many with MonitorData

#### 3. **FeatureData** - Stores original high-dimensional features
```go
type FeatureData struct {
    ID             uint
    FileUploadID   uint            // FK to FileUpload (PK)
    SourceFileName string
    Metadata       datatypes.JSON  // JSONB: segID, name, participant, etc.
    FeatureValues  pq.Float64Array // High-dimensional vector (e.g., f_0...f_1023)
}
```
- **Purpose**: Preserve original feature vectors for monitoring
- **One-to-One**: With FileUpload
- **Metadata Structure**:
```json
{
    "segID": "sample_001",
    "name": "Sample 001",
    "participant": "P001",
    "source_file": "data.csv",
    "processed_at": "2025-01-15T10:30:00Z",
    "sample_index": 0
}
```

#### 4. **MonitorData** - Individual monitoring points projected to 2D
```go
type MonitorData struct {
    ID             uint
    DinsightDataID uint           // FK to DinsightData (baseline)
    FileUploadID   uint
    DinsightX      float64        // Single X coordinate
    DinsightY      float64        // Single Y coordinate
    MonitorValues  Float64Array   // High-dimensional vector
    SourceFile     string
    Metadata       datatypes.JSON // JSONB metadata
    ProcessOrder   int            // Sequential order of processing
}
```
- **Purpose**: Store individual monitoring point coordinates
- **Key Difference from DinsightData**: Single point vs. arrays
- **ProcessOrder**: Maintains temporal/processing sequence

#### 5. **ConfigData** - Processing configuration parameters
```go
type ConfigData struct {
    // User-editable fields
    Gamma0    float64
    Optimizer string  // "adam" or "sgd"
    Alpha     float64
    EndMeta   string
    StartDim  string  // "f_0"
    EndDim    string  // "f_1023"
    
    // Algorithm parameters
    LowDim    int
    IMax      int     // Max iterations
    Eta       float64
    Epsilon   float64
    Beta1     float64
    Beta2     float64
    // ... more parameters
}
```
- **Purpose**: Configure the dimensionality reduction algorithm
- **Source**: `Dinsight_API/internal/processor/config.json`

#### 6. **User** - User accounts with authentication
```go
type User struct {
    ID            uint
    Email         string    // Unique
    PasswordHash  string
    FullName      string
    Role          string    // "user", "admin"
    IsActive      bool
    EmailVerified bool
    LastLogin     *time.Time
}
```

#### 7. **Analysis** - Links uploads to processing results
```go
type Analysis struct {
    ID            uint
    FileUploadID  uint
    DinsightID    *uint
    AnalysisType  string      // "baseline", "monitoring", "anomaly"
    Status        string      // "pending", "completed", "failed"
    Results       datatypes.JSON
    CreatedBy     uint
    CompletedAt   *time.Time
}
```

#### 8. **AnomalyClassification** - Anomaly detection results
```go
type AnomalyClassification struct {
    ID                  uint
    AnalysisID          uint
    BaselineDatasetID   uint
    ComparisonDatasetID uint
    AnomalyThreshold    float64
    AnomalyCount        int
    AnomalyPercentage   float64
    ClassificationData  datatypes.JSON
    Statistics          datatypes.JSON
}
```

#### 9. **StreamingConfig** - Real-time streaming configuration
```go
type StreamingConfig struct {
    ID             uint
    DinsightDataID uint  // Unique: one per baseline
    LatestGlowCount int  // Recent points to highlight
    BatchSize      int
    DelaySeconds   float64
}
```

#### 10. **DatasetMetadata** - Comprehensive dataset information
```go
type DatasetMetadata struct {
    DatasetID          uint
    DatasetType        string  // "baseline", "comparison", "monitoring"
    Name               string
    TotalRecords       int
    ValidRecords       int
    InvalidRecords     int
    DataQualityScore   float64
    NumericSummary     datatypes.JSON
    DistributionInfo   datatypes.JSON
    ProcessingStage    string  // "raw", "preprocessed", "transformed"
}
```

---

## API Endpoints

### Route Groups

```go
// 1. PUBLIC AUTH ROUTES (No license required)
POST   /api/v1/auth/register              // Register user
POST   /api/v1/auth/login                 // Login user
POST   /api/v1/auth/refresh               // Refresh JWT token
POST   /api/v1/auth/logout                // Logout (JWT required)
POST   /api/v1/auth/forgot-password       // Request password reset
POST   /api/v1/auth/reset-password        // Reset password

// 2. LICENSE-PROTECTED ROUTES (Requires license middleware)
POST   /api/v1/analyze                    // Upload files for analysis
POST   /api/v1/config                     // Set processing config
GET    /api/v1/config                     // Get processing config
GET    /api/v1/dinsight/:id               // Get baseline 2D coordinates
GET    /api/v1/feature/:file_upload_id    // Get all feature data
GET    /api/v1/feature/:file_upload_id/range  // Get feature range
GET    /api/v1/monitor/available          // List all baselines with monitoring
GET    /api/v1/monitor/baseline/:baseline_id  // Check monitoring for baseline
POST   /api/v1/monitor/:dinsight_id       // Upload monitoring data
GET    /api/v1/monitor/:dinsight_id       // Get all monitoring points
GET    /api/v1/monitor/:dinsight_id/coordinates // Get only X,Y coordinates
GET    /api/v1/streaming/:baseline_id/status    // Get streaming status
GET    /api/v1/streaming/:baseline_id/latest    // Get latest monitoring points
PUT    /api/v1/streaming/:baseline_id/config    // Update streaming config
DELETE /api/v1/streaming/:baseline_id/reset     // Reset streaming data

// 3. JWT-AUTHENTICATED ROUTES (Requires bearer token)
GET    /api/v1/users/profile              // Get user profile
PUT    /api/v1/users/profile              // Update profile
POST   /api/v1/users/change-password      // Change password
GET    /api/v1/users/sessions             // List active sessions
DELETE /api/v1/users/sessions/:sessionId  // Revoke session
POST   /api/v1/anomaly/detect             // Detect anomalies
POST   /api/v1/alerts/rules               // Create alert rule
GET    /api/v1/alerts/rules               // Get alert rules
GET    /api/v1/alerts                     // Get alerts
POST   /api/v1/datasets/metadata          // Create dataset metadata
GET    /api/v1/datasets/:dataset_id/metadata  // Get metadata
```

### Endpoint Details

#### Upload & Analysis

**POST /api/v1/analyze**
```
Request:
  - Method: POST
  - Content-Type: multipart/form-data
  - Body: files (one or more CSV files)

Response:
  {
    "success": true,
    "data": {
      "message": "Files uploaded and processing",
      "id": 42
    }
  }

Processing Flow:
  1. Save uploaded file(s) to disk
  2. Create FileUpload record (status: "uploading")
  3. Trigger background goroutine → processSingleFile() or processMergedFiles()
  4. Return immediately with file_upload_id
  5. Frontend polls /dinsight/:id to check completion
```

#### Get Baseline Coordinates

**GET /api/v1/dinsight/:id**
```
Parameters:
  - id: Can be either dinsight_data.id OR file_upload_id

Response:
  {
    "success": true,
    "data": {
      "dinsight_id": 1,
      "dinsight_x": [0.123, 0.456, 0.789, ...],
      "dinsight_y": [-0.321, -0.654, -0.987, ...]
    }
  }

Lookup Logic:
  1. Try to find by dinsight_data.id
  2. If not found, try dinsight_data.file_upload_id = id
  3. Returns both X and Y as arrays
```

#### Get Feature Data

**GET /api/v1/feature/:file_upload_id**
```
Response:
  {
    "success": true,
    "data": {
      "feature_values": [
        [0.1, 0.2, ..., 0.9],  // Row 0 features
        [0.11, 0.21, ..., 0.91], // Row 1 features
        ...
      ],
      "total_rows": 100,
      "metadata": [
        {
          "segID": "sample_001",
          "name": "Sample 001",
          "participant": "P001",
          "source_file": "baseline.csv"
        },
        ...
      ]
    }
  }

Notes:
  - Each row is one sample from original CSV
  - FeatureValues are high-dimensional (e.g., 1024 dimensions)
  - Metadata contains original metadata fields
```

#### Upload Monitoring Data

**POST /api/v1/monitor/:dinsight_id**
```
Request:
  - Content-Type: multipart/form-data
  - Body: file (CSV file with same columns as baseline)

Response:
  {
    "success": true,
    "data": {
      "dinsight_x": 0.234,
      "dinsight_y": -0.432,
      "process_order": 1,
      "monitor_values": [0.11, 0.21, ..., 0.91],
      "source_file": "monitoring.csv"
    }
  }

Processing:
  1. Extract feature vector from monitoring file
  2. Project to 2D using baseline as reference (via dinsightmon.ProcessMonitoring)
  3. Store in MonitorData table
  4. Return single X,Y coordinate pair
```

#### Get Monitoring Coordinates

**GET /api/v1/monitor/:dinsight_id/coordinates**
```
Response:
  {
    "dinsight_id": 1,
    "dinsight_x": [0.234, 0.345, 0.456, ...],
    "dinsight_y": [-0.432, -0.543, -0.654, ...]
  }

Notes:
  - Returns all monitoring points as arrays
  - Ordered by process_order (temporal/insertion order)
  - Separate from baseline coordinates
```

#### Get Streaming Status

**GET /api/v1/streaming/:baseline_id/status**
```
Response:
  {
    "success": true,
    "data": {
      "baseline_id": 1,
      "total_points": 200,
      "streamed_points": 145,
      "progress_percentage": 72.5,
      "baseline_points": 100,
      "is_active": true,
      "status": "streaming",
      "latest_glow_count": 5
    }
  }
```

---

## Data Flow

### Complete Workflow: From Upload to Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER UPLOADS BASELINE CSV                                    │
└─────────────────────────────────────────────────────────────────┘
          │
          ↓ POST /analyze with CSV file
┌─────────────────────────────────────────────────────────────────┐
│ 2. UPLOAD HANDLER RECEIVES FILE                                 │
│    - Save to disk: /tmp/{file_upload_id}_{filename}            │
│    - Create FileUpload record (status: "uploading")             │
│    - Launch async: go processSingleFile()                       │
│    - Return immediately with file_upload_id                     │
└─────────────────────────────────────────────────────────────────┘
          │
          ├─→ (async in background)
          │
          ↓ processSingleFile()
┌─────────────────────────────────────────────────────────────────┐
│ 3. PARSE CSV & CREATE INPUT DATA                                │
│    - Read CSV using csv.Reader                                  │
│    - Extract feature columns (f_0 to f_1023)                   │
│    - Extract metadata columns                                   │
│    - Create InputData struct:                                   │
│      - Vectors: [][]float64 (N rows × M dimensions)            │
│      - SegIDs: []string (sample identifiers)                   │
│      - Meta: [][]string (metadata values)                      │
│      - SourceFiles: []string (CSV filenames)                  │
└─────────────────────────────────────────────────────────────────┘
          │
          ↓ processor.ProcessData(inputData, config)
┌─────────────────────────────────────────────────────────────────┐
│ 4. DIMENSIONALITY REDUCTION PROCESSING                          │
│    A. Load Configuration                                         │
│       - Get latest ConfigData from database                     │
│       - Set algorithm parameters (optimizer, iterations, etc.)  │
│                                                                  │
│    B. Initialize 2D Points (p0)                                 │
│       - Mode: "kanadaSan" or other                             │
│       - Random initial positions in 2D space                    │
│                                                                  │
│    C. Calculate Distance Matrices                               │
│       - Build N×N distance matrix for high-dim vectors         │
│       - Apply MultiDistance: √(Σ(x₁-x₂)²)                     │
│       - Normalize distances using minDij, maxDij               │
│                                                                  │
│    D. Format Distance Function                                  │
│       - Apply: a*exp(-x²/w₁) + (1-a)*(1 - x²/w₂)             │
│       - With parameters: a=0.8, w₁=0.04, w₂=1.0               │
│                                                                  │
│    E. Optimization Loop (up to imax iterations)                 │
│       - Choose optimizer: Adam or SGD with momentum             │
│       - For each iteration:                                      │
│         1. Calculate 2D distances from p0                       │
│         2. Apply distance function to 2D distances              │
│         3. Calculate cost: Σ(normalized_dist - 2d_dist)²       │
│         4. Compute gradients                                     │
│         5. Update positions p1 using optimizer                  │
│         6. Check convergence: |cost_change| < gamma0            │
│       - Break if converged                                       │
│                                                                  │
│    F. Store Results in Database                                 │
│       - Create DinsightData record:                             │
│         - DinsightX = p0[*][0] (all X coordinates)             │
│         - DinsightY = p0[*][1] (all Y coordinates)             │
│       - Create FeatureData records (one per row):               │
│         - FeatureValues = original feature vector               │
│         - Metadata = JSON with segID, source, etc.              │
└─────────────────────────────────────────────────────────────────┘
          │
          ↓ Update FileUpload.status = "completed"
┌─────────────────────────────────────────────────────────────────┐
│ 5. FRONTEND POLLS FOR COMPLETION                                │
│    - GET /dinsight/{file_upload_id}                            │
│    - Receives: dinsight_x[], dinsight_y[]                      │
│    - Frontend caches and visualizes                             │
└─────────────────────────────────────────────────────────────────┘
          │
          ↓ User uploads monitoring file
┌─────────────────────────────────────────────────────────────────┐
│ 6. MONITORING UPLOAD & PROJECTION                               │
│    - POST /monitor/{dinsight_id} with monitoring CSV            │
│    - Handler calls dinsightmon.ProcessMonitoring()             │
│                                                                  │
│    Processing:                                                   │
│    1. Extract feature vector from monitoring row                │
│    2. Validate dimension matches baseline (1024 features)      │
│    3. Build reference matrices from baseline + previous monitor │
│       - matN: High-dimensional reference vectors               │
│       - mat2D: 2D baseline coordinates                          │
│    4. For each monitoring vector:                               │
│       - Calculate distances to all reference vectors            │
│       - Apply distance function to distances                    │
│       - Use optimizer to project to 2D                          │
│       - Store MonitorData record                                │
│    5. Return single (X, Y) coordinate                           │
└─────────────────────────────────────────────────────────────────┘
          │
          ↓ Frontend updates visualization with new point
```

---

## Coordinate Generation

### Baseline Coordinates (DinsightData)

**Algorithm: Custom Dimensionality Reduction**

1. **Input**: N samples × M features (e.g., 100 samples × 1024 features)

2. **High-Dimensional Distance Matrix**:
   ```
   D_ND[i,j] = √(Σ(f[i] - f[j])²) for all feature dimensions
   ```
   - Symmetric N×N matrix
   - Each cell: Euclidean distance between samples in high-D space

3. **Normalization**:
   ```
   D_norm[i,j] = (D_ND[i,j] - min_dist) / (max_dist - min_dist)
   w₁_auto = (sum of normalized distances) / (N × (N-1) / 2)
   ```

4. **Distance Function Applied**:
   ```
   D_func[i,j] = a × exp(-D_norm[i,j]² / w₁) + 
                 (1-a) × (1 - D_norm[i,j]² / w₂)
   
   With: a=0.8, w₁=0.04, w₂=1.0
   ```

5. **Initialize 2D Points**:
   ```
   p0[i] = [x_rand, y_rand] for each sample
   Mode: "kanadaSan" (random initialization with specific distribution)
   ```

6. **Optimization Loop**:
   ```
   For iteration t = 1 to imax:
     1. Calculate 2D distances: d2D[i,j] = √((x[i]-x[j])² + (y[i]-y[j])²)
     2. Apply distance function to 2D distances
     3. Cost = Σ_ij (D_func_ND[i,j] - D_func_2D[i,j])²
     4. Compute gradients: ∂Cost/∂p[i]
     5. Update using optimizer (Adam):
        - m_t = β₁*m_{t-1} + (1-β₁)*g_t
        - v_t = β₂*v_{t-1} + (1-β₂)*g_t²
        - p_t = p_{t-1} - α * m_t / (√v_t + ε)
     6. Check convergence: |cost_new - cost_old| < gamma0 (1e-7)
   
   Output: p_final[i][0] = X_i, p_final[i][1] = Y_i
   ```

**Storage**:
```go
DinsightData{
  DinsightX: [x₀, x₁, x₂, ..., x_{N-1}]  // All X coordinates
  DinsightY: [y₀, y₁, y₂, ..., y_{N-1}]  // All Y coordinates
}
```

### Monitoring Coordinates (MonitorData)

**Algorithm: Project New Points to Existing 2D Space**

1. **Setup Reference Matrices**:
   ```
   matN = [baseline_features, previous_monitoring_features]
   mat2D = [baseline_coordinates, previous_monitoring_coordinates]
   ```

2. **For Each Monitoring Sample**:
   ```
   1. Extract feature vector: mon_features
   
   2. Validate dimension: len(mon_features) == len(baseline_features[0])
   
   3. Calculate distances to all reference points:
      dist[i] = √(Σ(mon_features[j] - matN[i][j])²)
   
   4. Normalize distances (using same params as baseline)
   
   5. Apply distance function: d_func = a*exp(-d²/w₁) + (1-a)*(1-d²/w₂)
   
   6. Optimize 2D position (p_opt) to match reference distances:
      - Minimize: Σ(d_func_ND[i] - d_func_2D[i])²
      - Initial guess: random or previous position
      - Use Adam optimizer
   
   7. Return: (x_opt, y_opt)
   ```

3. **Storage**:
   ```go
   MonitorData{
     DinsightX: x_opt      // Single X coordinate
     DinsightY: y_opt      // Single Y coordinate
     ProcessOrder: 1       // Sequence number
     MonitorValues: []float64  // Original feature vector
   }
   ```

### Key Differences Between Baseline and Monitoring

| Aspect | Baseline (DinsightData) | Monitoring (MonitorData) |
|--------|------------------------|--------------------------|
| **Storage** | Arrays of coordinates | Individual points |
| **Count** | One per file upload | Many over time |
| **Calculation** | Pairwise all samples | Against baseline reference |
| **Update** | Computed once | On-demand per upload |
| **DB Query** | `SELECT dinsight_x, dinsight_y FROM dinsight_data WHERE id=?` | `SELECT dinsight_x, dinsight_y FROM monitor_data WHERE dinsight_data_id=? ORDER BY process_order` |

---

## Feature Data & Metadata Handling

### Feature Data Model

```go
type FeatureData struct {
    ID             uint            // Primary key
    FileUploadID   uint            // Foreign key to FileUpload (unique)
    SourceFileName string          // "baseline.csv", "monitoring.csv", etc.
    Metadata       datatypes.JSON  // JSONB column in PostgreSQL
    FeatureValues  pq.Float64Array // Array of high-dimensional values
}
```

### Feature Values Storage

**CSV Input Example**:
```csv
participant,segment_id,f_0,f_1,f_2,...,f_1023
P001,S001,0.123,0.456,0.789,...,0.999
P001,S002,0.124,0.457,0.790,...,0.998
...
```

**Processing**:
```go
// extract columns based on StartDim="f_0", EndDim="f_1023"
features := []float64{0.123, 0.456, 0.789, ..., 0.999}  // 1024 values

// Store as FeatureData
FeatureData{
    FileUploadID: 42,
    SourceFileName: "baseline.csv",
    FeatureValues: pq.Float64Array{0.123, 0.456, ..., 0.999},
    Metadata: jsonb{...}
}
```

### Metadata Structure

**Stored in JSONB Column**:
```json
{
  "segID": "S001",
  "name": "S001",
  "participant": "P001",
  "source_file": "baseline.csv",
  "processed_at": "2025-01-15T10:30:00Z",
  "sample_index": 0,
  // Any other columns from the CSV become metadata
  "custom_field": "custom_value"
}
```

**Extraction Process** (`processor.go`):
```go
// For each row in CSV:
// 1. Identify metadata columns (those NOT in feature range f_0..f_1023)
// 2. Build metadata map
metadataMap := map[string]interface{}{
    "segID": inputData.SegIDs[i],
    "name": inputData.SegIDs[i],
}

// 3. Add metadata from Meta array using MetaHeader
for j, metaValue := range inputData.Meta[i] {
    if j < len(inputData.MetaHeader) && metaValue != "" {
        metadataMap[inputData.MetaHeader[j]] = metaValue
    }
}

// 4. Add source file
metadataMap["source_file"] = inputData.SourceFiles[i]

// 5. Add processing timestamp
metadataMap["processed_at"] = time.Now().Format(time.RFC3339)

// 6. Add sample index
metadataMap["sample_index"] = i

// 7. Marshal to JSON
metadataBytes, _ := json.Marshal(metadataMap)
```

### Feature Retrieval API

**GET /api/v1/feature/:file_upload_id**

Response structure:
```json
{
  "success": true,
  "data": {
    "feature_values": [
      [0.123, 0.456, ..., 0.999],  // Row 0
      [0.124, 0.457, ..., 0.998],  // Row 1
      ...
    ],
    "total_rows": 100,
    "metadata": [
      {
        "segID": "S001",
        "name": "S001",
        "participant": "P001",
        "source_file": "baseline.csv",
        "processed_at": "2025-01-15T10:30:00Z"
      },
      ...
    ]
  }
}
```

### Feature Data Processing Pipeline

```
CSV File
  ↓
CSV Reader
  ↓ Extract columns by name:
    - Metadata columns: all columns NOT in [f_0...f_1023]
    - Feature columns: f_0 through f_1023
  ↓
For each row:
  - segID/participant (metadata)
  - feature_values (1024 floats)
  - Create FeatureData record
  ↓
Store in Database
  - FeatureData.FeatureValues = Float64Array
  - FeatureData.Metadata = JSONB
```

### Metadata Usage in Frontend

```typescript
// Frontend receives metadata via API
const metadata = {
  segID: "S001",
  name: "S001",
  participant: "P001",
  source_file: "baseline.csv"
};

// Used for:
// 1. Point labels in visualization
// 2. Data table columns
// 3. Filtering/searching
// 4. Anomaly report generation
// 5. Drill-down analysis
```

---

## Frontend Structure

### Directory Layout
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (providers, theme)
│   │   ├── page.tsx             # Home page
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── register/
│   │   │   └── page.tsx         # Registration page
│   │   └── dashboard/
│   │       ├── page.tsx         # Dashboard home
│   │       ├── layout.tsx       # Dashboard layout (sidebar, etc.)
│   │       ├── analysis/
│   │       │   └── page.tsx     # Analysis workflow
│   │       ├── dinsight-analysis/
│   │       │   └── page.tsx     # Baseline upload & config
│   │       ├── features/
│   │       │   └── page.tsx     # Feature visualization
│   │       ├── streaming/
│   │       │   └── page.tsx     # Real-time monitoring
│   │       ├── visualization/
│   │       │   └── page.tsx     # 2D plot visualization
│   │       └── settings/
│   │           └── page.tsx     # User settings
│   ├── components/
│   │   ├── ui/                  # Shadcn/ui components
│   │   ├── layout/              # Navigation, sidebar
│   │   ├── error-boundary.tsx   # Error handling
│   │   └── ...                  # Feature-specific components
│   ├── lib/
│   │   ├── api-client.ts        # Axios instance + endpoints
│   │   ├── navigation.ts        # Route definitions
│   │   └── utils.ts             # Utilities
│   ├── context/                 # React context
│   ├── types/                   # TypeScript interfaces
│   ├── styles/                  # Global CSS/Tailwind
│   └── utils/                   # Helper functions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

### Key Frontend Pages

#### DInsight Analysis (`/dashboard/dinsight-analysis`)
- **Purpose**: Main workflow for baseline upload and configuration
- **Components**:
  - File upload area (accepts multiple CSVs)
  - Config dialog for algorithm parameters
  - Processing status indicator
  - List of available baselines
- **API Calls**:
  - `POST /analyze` - Upload baseline
  - `GET /config` - Fetch current config
  - `POST /config` - Update config
  - `GET /dinsight/{id}` - Poll for completion

#### Visualization (`/dashboard/visualization`)
- **Purpose**: Display 2D scatter plots
- **Technology**: Plotly.js for interactive charts
- **Displays**:
  - Baseline points (blue dots)
  - Monitoring points (red dots)
  - Latest points highlighted
- **API Calls**:
  - `GET /dinsight/{id}` - Baseline coordinates
  - `GET /monitor/{id}/coordinates` - Monitoring coordinates

#### Streaming (`/dashboard/streaming`)
- **Purpose**: Real-time monitoring visualization
- **Polling**: `GET /streaming/{id}/latest` every 2-5 seconds
- **Features**:
  - Live point updates
  - Progress bar
  - Stream start/stop controls

### API Client (`lib/api-client.ts`)

```typescript
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

// Token Management
tokenManager.setTokens(accessToken, refreshToken, expiresIn);
tokenManager.getAccessToken();
tokenManager.clearTokens();

// Request Interceptor: Add JWT to every request
config.headers.Authorization = `Bearer ${token}`;

// Response Interceptor: Handle 401 + token refresh
if (status === 401) {
  refreshToken();
  retryRequest();
}

// API Methods Grouped by Feature
api.analysis.upload(files);
api.analysis.getDinsight(id);
api.monitoring.getCoordinates(dinsightId);
api.streaming.getStatus(baselineId);
api.anomaly.detect(data);
```

### State Management

**Zustand Stores** (or Context API):
- User authentication state
- Current analysis state
- Baseline/monitoring selection
- Real-time streaming state

**React Query** (TanStack Query):
- Caching API responses
- Automatic refetching
- Background polling
- Stale-while-revalidate

---

## Key Processing Pipelines

### 1. Baseline Processing Pipeline

```
User selects CSV file(s)
    ↓
frontend/src/app/dashboard/dinsight-analysis/page.tsx
    ↓ upload via FileUpload component
react-dropzone → api.analysis.upload(files)
    ↓ POST /analyze
Dinsight_API/internal/handler/upload.go
    ↓ HandleFileUpload()
  1. Validate files (CSV format)
  2. Create FileUpload record
  3. Save to disk
  4. Launch go processSingleFile()
  5. Return immediately
    ↓
go processSingleFile() [async, background]
  internal/processor/processor.go
    ↓ ProcessUploadedFile()
  1. Parse CSV
     - Extract features (f_0...f_1023)
     - Extract metadata (participant, etc.)
  2. Create InputData struct
  3. Call ProcessData()
     ↓ Run Dimensionality Reduction
     - Build ND distance matrix
     - Initialize 2D points
     - Optimize positions (Adam)
     - Store DinsightData + FeatureData
  4. Update FileUpload.status = "completed"
    ↓
Frontend polls GET /dinsight/{id}
    ↓ receivesDinsightData with arrays
Display scatter plot
```

### 2. Monitoring Processing Pipeline

```
User selects monitoring CSV
    ↓ POST /monitor/{dinsight_id} with file
internal/handler/monitor.go
    ↓ HandleMonitoring()
  1. Parse monitoring CSV
  2. Call dinsightmon.ProcessMonitoring()
    ↓ internal/dinsightmon/monitor.go
    - Extract feature vector
    - Validate dimensions
    - Build reference matrices (baseline + previous)
    - Project to 2D (minimize distance mismatch)
    - Store MonitorData
  3. Return single (X, Y) coordinate
    ↓
GET /monitor/{dinsight_id}/coordinates
    ↓ Returns all monitoring points as arrays
    ↓ 
Update visualization with new red points
```

### 3. Anomaly Detection Pipeline

```
User selects baseline + comparison datasets
    ↓ POST /anomaly/detect
internal/handler/anomaly.go
    ↓ DetectAnomalies()
  1. Fetch baseline coordinates + features
  2. Fetch comparison coordinates + features
  3. Calculate Mahalanobis Distance:
     MD = √((x - μ)ᵀ × Σ⁻¹ × (x - μ))
     where:
       x = comparison sample
       μ = baseline mean
       Σ = baseline covariance matrix
  4. Apply sensitivity threshold
  5. Count anomalies
  6. Store AnomalyClassification result
    ↓
Return classification results
  {
    "anomaly_percentage": 15.5,
    "anomaly_count": 31,
    "anomalies": [
      { "index": 5, "distance": 3.2, "threshold": 2.5 },
      ...
    ]
  }
```

### 4. Configuration Update Pipeline

```
User modifies algorithm parameters
    ↓
frontend/ConfigDialog component
    ↓ POST /config
internal/handler/config.go
    ↓ SetConfig()
  1. Validate parameters
  2. Update ConfigData in database
    ↓
Next baseline upload uses new config
  ProcessData() fetches latest ConfigData
  Uses updated parameters:
    - optimizer ("adam" or "sgd")
    - alpha, eta, beta1, beta2
    - gamma0 (convergence threshold)
    - dimensions (f_0...f_1023)
```

---

## Configuration System

### ConfigData Fields

**User-Editable**:
```go
Gamma0    = 1e-7    // Convergence threshold
Optimizer = "adam"  // "adam" or "sgd"
Alpha     = 0.1     // Learning rate
EndMeta   = "participant"  // Metadata column to extract
StartDim  = "f_0"          // First feature column
EndDim    = "f_1023"       // Last feature column
```

**Algorithm Parameters**:
```go
IMax     = 1000          // Max iterations
LowDim   = 2             // Target dimensions
Eta      = 0.5           // Momentum term
Epsilon  = 1e-8          // Numerical stability
Beta1    = 0.9           // Adam β₁
Beta2    = 0.999         // Adam β₂
Beta     = 0.5           // Distance function param
A        = 0.8           // Distance function param
W1       = 0.04          // Distance function param
W2       = 1.0           // Distance function param
WhichW1  = "auto"        // Auto-calculate w1
Mode     = "kanadaSan"   // Initialization mode
ParamMode= 0.3           // Initialization parameter
```

---

## Summary of Data Flow

```
┌─── User Uploads CSV ───┐
│                         │
│  CSV File              │
│  ├─ Columns: participant, segment_id, f_0, ..., f_1023
│  └─ Rows: 100 samples
│
└──────────┬──────────────┘
           │
           ↓
┌─── Feature Extraction ───┐
│                           │
│  For each row:            │
│  ├─ Metadata: participant, segment_id
│  ├─ Features: [f_0...f_1023]  # 1024-D vector
│  └─ Store both
│
└──────────┬────────────────┘
           │
           ↓
┌─── Dimensionality Reduction ───┐
│                                  │
│  Input: 100 × 1024-D vectors     │
│  Algorithm: Optimize 2D positions│
│  Output: 100 × (X, Y) points    │
│
│  Stored in:                      │
│  - DinsightData (arrays)        │
│  - FeatureData (original vectors)|
│
└──────────┬─────────────────────┘
           │
           ↓
┌─── Frontend Visualization ───┐
│                               │
│  Scatter Plot:                │
│  ├─ X-axis: DinsightX values │
│  ├─ Y-axis: DinsightY values │
│  ├─ Points: 100 blue dots    │
│  ├─ Hover: Shows metadata    │
│  └─ Click: Shows features    │
│
└───────────────────────────────┘

┌─── New Monitoring Data ───────┐
│                                │
│  CSV with same features        │
│  └─ 5 new samples             │
│
└──────────┬────────────────────┘
           │
           ↓
┌─── Project to 2D Space ────┐
│                             │
│  For each new sample:       │
│  1. Calculate distances     │
│     to all baseline points  │
│  2. Optimize 2D position    │
│     to match distances      │
│  3. Store (X, Y) point     │
│                             │
│  Stored in:                 │
│  - MonitorData (single row) │
│
└──────────┬─────────────────┘
           │
           ↓
┌─── Frontend Update ────────┐
│                             │
│  Scatter Plot:              │
│  ├─ Blue dots: Baseline    │
│  ├─ Red dots: Monitoring   │
│  ├─ Highlight: Latest 5    │
│  └─ Animation: New points  │
│
└─────────────────────────────┘
```

---

## Key Takeaways

### 1. **Coordinate Generation Strategy**
- **Baseline**: All samples processed together in single optimization pass
- **Monitoring**: Individual samples projected against baseline + historical data
- Uses custom distance function with configurable parameters
- Supports both Adam and SGD optimizers

### 2. **Data Organization**
- **DinsightData**: Stores arrays of coordinates (one record = entire baseline)
- **MonitorData**: Stores individual points (one record = one monitoring sample)
- **FeatureData**: Preserves original high-dimensional vectors for reference
- **Metadata**: Stored as JSONB for flexibility

### 3. **API Design**
- License-protected routes for analysis/monitoring
- JWT-protected routes for user operations
- Proper separation of concerns (handlers, processors, models)
- Returns arrays for baseline, single values for monitoring

### 4. **Frontend Architecture**
- React Query for caching and polling
- Zustand or Context for state management
- Plotly.js for interactive visualizations
- Proper error boundaries and loading states

### 5. **Performance Considerations**
- Asynchronous processing for file uploads
- Database indexes on frequently queried columns
- Polling strategy for monitoring (configurable intervals)
- Array storage for efficient coordinate retrieval

---

## Important Files Reference

### Backend
- **Entry Point**: `Dinsight_API/cmd/api/main.go`
- **Routes**: `Dinsight_API/internal/routes/routes.go`
- **Models**: `Dinsight_API/internal/model/models.go`
- **Upload Handler**: `Dinsight_API/internal/handler/upload.go`
- **Processor**: `Dinsight_API/internal/processor/processor.go`
- **Monitor**: `Dinsight_API/internal/dinsightmon/monitor.go`
- **Config**: `Dinsight_API/config/config.go`

### Frontend
- **API Client**: `frontend/src/lib/api-client.ts`
- **Analysis Page**: `frontend/src/app/dashboard/dinsight-analysis/page.tsx`
- **Visualization**: `frontend/src/app/dashboard/visualization/page.tsx`

---

*Document Version: 1.0*  
*Last Updated: Oct 16, 2025*
