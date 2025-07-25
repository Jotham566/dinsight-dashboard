# Dinsight Platform - Technical Architecture Document

## Technology Stack (July 2025)

Based on the latest stable versions and best practices for enterprise applications:

### Backend Technology Stack

#### Core Framework
- **Go 1.24.5** (Latest stable release - July 2025)
- **Gin Web Framework** - High-performance HTTP web framework
- **PostgreSQL 15+** - Primary database with JSON and array support
- **GORM v2** - ORM for database operations

#### Dependencies & Libraries
```go
// Core dependencies (latest stable versions)
github.com/gin-gonic/gin v1.10.0
gorm.io/gorm v1.25.12
gorm.io/driver/postgres v1.5.9
github.com/golang-jwt/jwt/v5 v5.2.1
github.com/swaggo/gin-swagger v1.6.0
github.com/go-redis/redis/v8 v8.11.5
github.com/golang-migrate/migrate/v4 v4.17.1

// Authentication & Security
golang.org/x/crypto/argon2 v0.16.0      // Password hashing (Argon2id)
github.com/golang-jwt/jwt/v5 v5.2.1      // JWT tokens
github.com/google/uuid v1.6.0            // UUID generation
golang.org/x/time v0.5.0                 // Rate limiting

// Additional utilities
github.com/lib/pq v1.10.9
github.com/stretchr/testify v1.9.0
github.com/spf13/viper v1.19.0
gorm.io/datatypes v1.2.0                 // JSONB support
```

### Frontend Technology Stack

#### Core Framework
- **Next.js 15.3** (Latest stable - July 2025) with React 19
- **TypeScript 5.6** - Type safety and developer experience
- **Turbopack** (Built-in Next.js build system)
- **Material-UI v6** or **Ant Design v5** - UI Component Library

#### Frontend Dependencies
```json
{
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0",
    "@mui/material": "^6.0.0",
    "@emotion/react": "^11.13.0",
    "@emotion/styled": "^11.13.0",
    "@reduxjs/toolkit": "^2.3.0",
    "react-redux": "^9.1.0",
    "recharts": "^2.13.0",
    "axios": "^1.7.0",
    "@tanstack/react-query": "^5.59.0"
  },
  "devDependencies": {
    "@next/eslint-config-next": "^15.3.0",
    "eslint": "^9.15.0",
    "@typescript-eslint/eslint-plugin": "^8.15.0",
    "prettier": "^3.3.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0"
  }
}
```

### Infrastructure & DevOps

#### Development & Production
- **Docker & Docker Compose** - Containerization
- **Redis 7+** - Caching and session management
- **Nginx** - Reverse proxy and load balancing
- **GitHub Actions** - CI/CD pipeline

#### Monitoring & Observability
- **Prometheus + Grafana** - Metrics and monitoring
- **Structured logging** with JSON format
- **Health check endpoints** for service monitoring

---

## System Architecture

### Microservices Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │   Dashboard     │ │   Data Upload   │ │   Monitoring    │  │
│  │   Components    │ │   Components    │ │   Components    │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (Nginx)                       │
│                    Load Balancer & SSL                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Services (Go)                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │   Auth Service  │ │   Data Service  │ │  Monitor Service│  │
│  │   - JWT tokens  │ │   - Processing  │ │   - Real-time   │  │
│  │   - RBAC        │ │   - Analytics   │ │   - Alerts      │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │   Redis Cache   │ │  File Storage   │
│   - Main DB     │ │   - Sessions    │ │   - Uploads     │
│   - User Data   │ │   - Job Queue   │ │   - Results     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### API Architecture Patterns

#### RESTful API Design
- **Resource-based URLs**: `/api/v1/resources/{id}`
- **HTTP methods**: GET, POST, PUT, DELETE, PATCH
- **Consistent response format**:
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "timestamp": "2025-07-23T10:30:00Z",
  "request_id": "uuid-v4"
}
```

#### API Versioning Strategy
- **URL versioning**: `/api/v1/`, `/api/v2/`
- **Backward compatibility** for at least 2 major versions
- **Deprecation warnings** in response headers

#### Error Handling Standards
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2025-07-23T10:30:00Z",
  "request_id": "uuid-v4"
}
```

### Database Architecture

#### Enhanced Enterprise Schema Design

##### Authentication & Multi-Tenancy Tables
```sql
-- Organizations (Multi-tenant support)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    license_key VARCHAR(500), -- Link to existing device licensing system
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 10,
    max_projects INTEGER DEFAULT 5,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Users with RBAC and security features
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'user',
    organization_id UUID REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles enumeration
CREATE TYPE user_role AS ENUM (
    'system_admin',
    'org_admin', 
    'project_lead',
    'analyst',
    'viewer'
);

-- Session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects with organization context
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id),
    owner_id UUID REFERENCES users(id),
    visibility project_visibility DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE project_visibility AS ENUM ('private', 'organization', 'public');

##### Existing Tables (Enhanced with User/Project Context)
```sql
-- EXISTING WORKING TABLES - Enhanced with user/project context
-- These 6 tables are preserved from current working implementation

-- Enhanced file uploads (add user/project context to existing)
ALTER TABLE file_uploads ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE file_uploads ADD COLUMN user_id UUID REFERENCES users(id);

-- Current structure preserved:
-- file_uploads: id, original_file_name, file_size, status, error_message, is_merged, merged_files
-- config_data: gamma0, optimizer, alpha, end_meta, start_dim, end_dim, etc.
-- dinsight_data: file_upload_id, config_id, dinsight_x[], dinsight_y[], source_files[]
-- feature_data: file_upload_id, source_file_name, metadata, feature_values[]
-- experiments: name, file_references[], dinsight_base_id
-- monitor_data: dinsight_data_id, file_upload_id, monitor_values[], dinsight_x, dinsight_y
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    checksum VARCHAR(64),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced datasets
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    file_upload_id INTEGER REFERENCES file_uploads(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    row_count INTEGER,
    column_count INTEGER,
    schema_info JSONB,
    quality_score DECIMAL(3,2),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Models (trained baseline models)
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    dataset_id UUID REFERENCES datasets(id),
    name VARCHAR(255) NOT NULL,
    algorithm VARCHAR(100) NOT NULL DEFAULT 'dinsight',
    hyperparameters JSONB,
    performance_metrics JSONB,
    model_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'training',
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitor sessions
CREATE TABLE monitor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    model_id UUID REFERENCES models(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    threshold_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts and notifications
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_session_id UUID REFERENCES monitor_sessions(id),
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    anomaly_score DECIMAL(5,4),
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

##### Indexes for Performance
```sql
-- Core indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_project ON file_uploads(project_id);
CREATE INDEX idx_datasets_project ON datasets(project_id);
CREATE INDEX idx_models_project ON models(project_id);
CREATE INDEX idx_alerts_session ON alerts(monitor_session_id);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- Compound indexes for common queries
CREATE INDEX idx_file_uploads_status_created ON file_uploads(status, created_at DESC);
CREATE INDEX idx_alerts_unack_severity ON alerts(is_acknowledged, severity, created_at DESC);
```

### Enhanced Security Architecture

#### Dual-Layer Authentication System

The platform implements a **dual-layer authentication system** that preserves the existing sophisticated device-based licensing while adding enterprise user authentication:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                             │
│                                                                │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │  Layer 1:       │    │  Layer 2:       │                  │
│  │  Device License │ -> │  User Auth      │ -> Application   │
│  │  (RSA JWT)      │    │  (JWT + RBAC)   │                  │
│  └─────────────────┘    └─────────────────┘                  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

#### Enhanced JWT Token Strategy
```go
// Preserve existing license claims
type LicenseClaims struct {
    CustomerID string    `json:"customer_id"`
    ExpiresAt  time.Time `json:"expires_at"`
    MaxDevices int       `json:"max_devices"`
    Version    string    `json:"version"`
    Features   []string  `json:"features"`
    jwt.RegisteredClaims
}

// New user authentication claims
type UserClaims struct {
    UserID         string   `json:"user_id"`
    Email          string   `json:"email"`
    Role           string   `json:"role"`
    OrganizationID string   `json:"org_id"`
    Permissions    []string `json:"permissions"`
    SessionID      string   `json:"session_id"`
    jwt.RegisteredClaims
}

// Token pairs for user authentication
type TokenPair struct {
    AccessToken  string `json:"access_token"`  // 15 minutes
    RefreshToken string `json:"refresh_token"` // 7 days
}
```

#### Password Security (Argon2id - Industry Best Practice)
```go
type PasswordService struct {
    time    uint32 // 3 iterations
    memory  uint32 // 64*1024 (64MB)
    threads uint8  // 4 threads
    keyLen  uint32 // 32 bytes
}

func (p *PasswordService) HashPassword(password string) (string, error) {
    salt := make([]byte, 16)
    rand.Read(salt)
    
    hash := argon2.IDKey([]byte(password), salt, p.time, p.memory, p.threads, p.keyLen)
    
    // Format: $argon2id$v=19$m=65536,t=3,p=4$salt$hash
    return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version, p.memory, p.time, p.threads,
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash)), nil
}
```

##### Role-Based Access Control (RBAC)
```go
type Role string

const (
    RoleAdmin     Role = "admin"
    RoleManager   Role = "manager"
    RoleAnalyst   Role = "analyst"
    RoleViewer    Role = "viewer"
)

type Permission string

const (
    PermissionReadData      Permission = "data:read"
    PermissionWriteData     Permission = "data:write"
    PermissionDeleteData    Permission = "data:delete"
    PermissionManageUsers   Permission = "users:manage"
    PermissionManageModels  Permission = "models:manage"
    PermissionViewAlerts    Permission = "alerts:view"
    PermissionManageAlerts  Permission = "alerts:manage"
)
```

#### API Security

##### Rate Limiting
```go
// Per-user rate limits
var rateLimits = map[string]time.Duration{
    "upload":     time.Minute,      // 1 upload per minute
    "processing": time.Minute * 5,   // 1 processing job per 5 minutes
    "api":        time.Second,       // 100 requests per second
}
```

##### Input Validation & Sanitization
```go
type FileUploadRequest struct {
    ProjectID string    `json:"project_id" binding:"required,uuid"`
    Name      string    `json:"name" binding:"required,min=1,max=255"`
    Tags      []string  `json:"tags" binding:"dive,min=1,max=50"`
}
```

### Performance Architecture

#### Caching Strategy

##### Redis Cache Layers
```go
// Cache TTL strategies
var cacheTTL = map[string]time.Duration{
    "user_session":      time.Hour * 24,
    "dataset_metadata":  time.Hour * 6,
    "model_results":     time.Hour * 12,
    "alert_counts":      time.Minute * 5,
    "dashboard_stats":   time.Minute * 1,
}
```

##### Database Query Optimization
- **Connection pooling**: 25 max connections per service
- **Prepared statements** for repeated queries
- **Query result caching** for expensive analytics
- **Pagination** with cursor-based navigation

#### Async Processing

##### Background Job Queue (Redis-based)
```go
type JobType string

const (
    JobFileProcessing   JobType = "file_processing"
    JobModelTraining    JobType = "model_training"
    JobDataValidation   JobType = "data_validation"
    JobReportGeneration JobType = "report_generation"
)

type Job struct {
    ID       string                 `json:"id"`
    Type     JobType               `json:"type"`
    Status   string                `json:"status"`
    Payload  map[string]interface{} `json:"payload"`
    Progress int                   `json:"progress"`
    Error    string                `json:"error,omitempty"`
    CreatedAt time.Time            `json:"created_at"`
    UpdatedAt time.Time            `json:"updated_at"`
}
```

### Real-time Architecture

#### WebSocket Communication
```go
type WebSocketMessage struct {
    Type      string      `json:"type"`
    Channel   string      `json:"channel"`
    Data      interface{} `json:"data"`
    Timestamp time.Time   `json:"timestamp"`
}

// Message types
const (
    MsgTypeAlert       = "alert"
    MsgTypeProgress    = "progress"
    MsgTypeDataUpdate  = "data_update"
    MsgTypeNotification = "notification"
)
```

#### Server-Sent Events (SSE) for Dashboard Updates
```go
type SSEEvent struct {
    Event string `json:"event"`
    Data  string `json:"data"`
    ID    string `json:"id,omitempty"`
    Retry int    `json:"retry,omitempty"`
}
```

### Monitoring & Observability

#### Application Metrics
```go
// Prometheus metrics
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
        },
        []string{"method", "endpoint"},
    )
    
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)
```

#### Health Check System
```go
type HealthCheck struct {
    Service   string    `json:"service"`
    Status    string    `json:"status"`
    Timestamp time.Time `json:"timestamp"`
    Details   map[string]interface{} `json:"details,omitempty"`
}

type HealthStatus struct {
    Overall   string                  `json:"overall"`
    Services  map[string]HealthCheck  `json:"services"`
    Timestamp time.Time              `json:"timestamp"`
}
```

### Deployment Architecture

#### Docker Configuration
```dockerfile
# Multi-stage build for Go backend
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
```

#### Docker Compose for Development
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: dinsight
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./Dinsight_API
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/dinsight?sslmode=disable
      - REDIS_URL=redis://redis:6379

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080

volumes:
  postgres_data:
```

### Migration Strategy

#### Database Migrations
```go
// Using golang-migrate for version control
// migrations/001_initial_schema.up.sql
// migrations/001_initial_schema.down.sql
// migrations/002_add_projects.up.sql
// migrations/002_add_projects.down.sql
```

#### API Versioning & Backward Compatibility
- **Gradual rollout** of new API versions
- **Feature flags** for experimental features
- **Deprecation notices** 6 months before removal
- **Automatic migration tools** for data structure changes

---

## Mahalanobis Anomaly Detection System

### Mathematical Implementation

#### Core Algorithm
```go
type MahalanobisDetector struct {
    BaselineData     []Point2D
    BaselineCentroid Point2D
    CovarianceMatrix *mat.Dense
    InvCovMatrix     *mat.Dense
    BaselineDistances []float64
    ThresholdMean    float64
    ThresholdStd     float64
}

type Point2D struct {
    X float64 `json:"dinsight_x"`
    Y float64 `json:"dinsight_y"`
}
```

#### Distance Calculation
```
distance = sqrt((x - μ)ᵀ × Σ⁻¹ × (x - μ))

Where:
- x = monitoring data point (2D coordinate)
- μ = reference dataset centroid 
- Σ⁻¹ = inverse covariance matrix of reference dataset
```

#### Adaptive Threshold System
```
threshold = mean(baseline_distances) + sensitivity_factor × std(baseline_distances)

Sensitivity Levels:
- High Sensitivity: ≤1.5x (detects subtle variations)
- Medium Sensitivity: 2.0-3.5x (balanced detection) 
- Low Sensitivity: ≥4.0x (focuses on significant deviations)
```

### API Endpoints
- `POST /api/v1/anomaly/detect` - Core anomaly detection
- `GET /api/v1/anomaly/distance-distribution/{baseline_id}/{monitoring_id}` - Histogram data
- `POST /api/v1/anomaly/batch-detect` - Multiple monitoring datasets
- `GET /api/v1/anomaly/sensitivity-analysis/{baseline_id}/{monitoring_id}` - Sensitivity curves

### Database Integration
```sql
-- Anomaly detection results storage
CREATE TABLE anomaly_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baseline_dataset_id UUID REFERENCES datasets(id),
    monitoring_dataset_id UUID REFERENCES datasets(id),
    sensitivity_factor DECIMAL(3,1),
    threshold_value DECIMAL(10,6),
    anomaly_count INTEGER,
    total_points INTEGER,
    anomaly_percentage DECIMAL(5,2),
    baseline_centroid JSONB,
    covariance_matrix JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### External Dependencies
- **gonum/stat** - Statistical functions and matrix operations
- **gonum/mat** - Matrix operations and linear algebra

---

## Development Best Practices

### Code Quality Standards
- **Go linting**: golangci-lint with strict rules
- **Test coverage**: Minimum 80% for critical paths
- **Code review**: Required for all changes
- **Documentation**: GoDoc for all public APIs

### API Documentation
- **OpenAPI 3.0** specification
- **Automated documentation** generation
- **Interactive API explorer** with Swagger UI
- **Code examples** in multiple languages

### Security Best Practices
- **Input validation** at all API boundaries
- **SQL injection prevention** with prepared statements
- **XSS protection** with proper escaping
- **CSRF protection** with token validation
- **Regular security audits** and dependency updates

This architecture provides a solid foundation for a scalable, maintainable, and secure predictive maintenance platform that can grow with business needs while maintaining high performance and reliability.
