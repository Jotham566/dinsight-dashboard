# Dinsight API Enhancement Plan

## Current API Analysis

### Existing Endpoints (Current Implementation)
```
POST /api/v1/analyze                        - File upload and analysis
GET  /api/v1/config                        - Get configuration
POST /api/v1/config                        - Set configuration
GET  /api/v1/dinsight/:id                  - Get dinsight values
GET  /api/v1/feature/:file_upload_id       - Get feature values
GET  /api/v1/feature/:file_upload_id/range - Get feature values range
POST /api/v1/monitor/:dinsight_id          - Process monitoring data
GET  /api/v1/monitor/:dinsight_id          - Get monitoring values
GET  /api/v1/monitor/:dinsight_id/coordinates - Get monitoring coordinates
GET  /api/v1/monitor/:id/anomalies         - Get anomaly detection results
```

### Missing Critical Endpoints (Based on Requirements)

#### 1. Authentication & User Management
```
POST /api/v1/auth/login                    - User login
POST /api/v1/auth/logout                   - User logout
POST /api/v1/auth/refresh                  - Refresh token
POST /api/v1/auth/register                 - User registration
GET  /api/v1/auth/me                       - Get current user
PUT  /api/v1/auth/profile                  - Update user profile
POST /api/v1/auth/forgot-password          - Request password reset
POST /api/v1/auth/reset-password           - Reset password
```

#### 2. Project Management
```
GET  /api/v1/projects                      - List projects
POST /api/v1/projects                      - Create project
GET  /api/v1/projects/:id                  - Get project details
PUT  /api/v1/projects/:id                  - Update project
DELETE /api/v1/projects/:id                - Delete project
GET  /api/v1/projects/:id/datasets         - List project datasets
GET  /api/v1/projects/:id/stats            - Project statistics
```

#### 3. Enhanced Dataset Management
```
GET  /api/v1/datasets                      - List all datasets (paginated)
GET  /api/v1/datasets/:id                  - Get dataset details
PUT  /api/v1/datasets/:id                  - Update dataset metadata
DELETE /api/v1/datasets/:id                - Delete dataset
GET  /api/v1/datasets/:id/preview          - Dataset preview
GET  /api/v1/datasets/:id/stats            - Dataset statistics
GET  /api/v1/datasets/:id/quality          - Data quality report
POST /api/v1/datasets/:id/validate         - Validate dataset
```

#### 4. Industrial Alert & Notification Management
```
GET  /api/v1/alerts                        - List industrial equipment alerts
GET  /api/v1/alerts/:id                    - Get detailed alert information
POST /api/v1/alerts/:id/acknowledge        - Acknowledge equipment failure alert
PUT  /api/v1/alerts/:id                    - Update alert severity or status
DELETE /api/v1/alerts/:id                  - Delete resolved alert
GET  /api/v1/alerts/unacknowledged         - Get critical unacknowledged alerts
POST /api/v1/alerts/bulk-acknowledge       - Bulk acknowledge multiple alerts
GET  /api/v1/alerts/by-machine/:machine_id - Get alerts for specific equipment
POST /api/v1/alerts/escalate/:id           - Escalate alert to supervisor
GET  /api/v1/alerts/patterns               - Get alert patterns for predictive analysis
```

#### 5. Industrial Real-time Monitoring & Dashboard
```
GET  /api/v1/dashboard/stats               - Multi-machine performance statistics
GET  /api/v1/dashboard/charts              - Real-time equipment trend charts
GET  /api/v1/dashboard/kpi                 - OEE and operational KPIs
GET  /api/v1/dashboard/config/:area        - Get dashboard configuration for operational area
POST /api/v1/dashboard/config/:area       - Update dashboard layout and widgets
GET  /api/v1/system/health                 - Industrial system health check
GET  /api/v1/system/metrics                - Equipment performance metrics
WebSocket /api/v1/ws                       - Real-time industrial data streaming
SSE /api/v1/stream/:machine_id             - Server-sent events for specific machine
GET  /api/v1/shift-reports/:shift_id       - Automated shift operational reports
```

#### 6. Industrial Notification & Integration
```
POST /api/v1/notifications/email           - Send equipment failure email notifications
POST /api/v1/notifications/sms             - Send critical SMS alerts to operators
POST /api/v1/notifications/webhook         - Trigger CMMS webhook integration
GET  /api/v1/notifications/delivery/:id    - Check notification delivery status
POST /api/v1/notifications/templates       - Create custom notification templates
GET  /api/v1/maintenance/schedule          - Get maintenance windows for alert suppression
POST /api/v1/maintenance/mode/:machine_id  - Enable/disable maintenance mode
```

#### 7. Job & Task Management
```
GET  /api/v1/jobs                          - List background jobs
GET  /api/v1/jobs/:id                      - Get job status
DELETE /api/v1/jobs/:id                    - Cancel job
GET  /api/v1/jobs/:id/logs                 - Get job logs
POST /api/v1/jobs/:id/retry                - Retry failed job
```

#### 7. Essential Data Export
```
GET  /api/v2/export/dinsight/:id/csv       - Export Dinsight coordinates as CSV
GET  /api/v2/export/dinsight/:id/json      - Export Dinsight results as JSON  
GET  /api/v2/export/feature/:id/csv        - Export feature data as CSV
GET  /api/v2/export/monitor/:id/csv        - Export monitoring results as CSV
GET  /api/v2/export/quality-report/:id/json - Export quality reports as JSON
```

**Note**: Export functionality has been simplified to focus on essential user needs rather than over-engineered features. Complex multi-format exports, API key management, scheduled exports, and webhook systems have been eliminated in favor of simple, reliable data downloads.

## Enterprise Authentication & Licensing Strategy

### Current Licensing System Analysis
The existing implementation has a **sophisticated device-based licensing system** that should be preserved and enhanced:

**Strengths:**
- RSA-based JWT license validation with embedded public key
- Device fingerprinting and registration management
- License expiration tracking with cache optimization
- Production-ready licensing middleware

**Recommendation: Preserve and enhance** the current licensing system rather than replace it.

### Dual-Layer Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                                │
│                                                                │
│  Client Request                                               │
│        ↓                                                      │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │  License Check  │ -> │   User Auth     │ -> Application   │
│  │  (Device Level) │    │  (User Level)   │                  │
│  └─────────────────┘    └─────────────────┘                  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Enhanced Middleware Stack
```go
// Updated middleware chain preserving license system
r.Use(
    middleware.CORS(),
    middleware.RequestID(),
    middleware.LicenseMiddleware(licenseManager, deviceManager), // Keep existing
    middleware.AuthenticationMiddleware(authService),            // Add user auth
    middleware.AuthorizationMiddleware(rbacService),            // Add RBAC
    middleware.RateLimitMiddleware(rateLimiter),                // Add rate limiting
)
```

## Implementation Priority

### Phase 1: Enhanced Authentication Foundation (Week 1-2)
**Priority: Critical - Preserve Current + Add Enterprise Auth**

1. **Multi-Tenant User Management System**
   ```go
   // Enhanced user model with organization support
   type User struct {
       ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
       Email            string    `gorm:"unique;not null"`
       PasswordHash     string    `gorm:"not null" json:"-"`
       FirstName        string    
       LastName         string    
       Role             UserRole  `gorm:"not null;default:'user'"`
       OrganizationID   uuid.UUID `gorm:"type:uuid"`
       IsActive         bool      `gorm:"default:true"`
       EmailVerified    bool      `gorm:"default:false"`
       FailedAttempts   int       `gorm:"default:0"`
       LockedUntil      *time.Time
       LastLogin        *time.Time
   }

   type Organization struct {
       ID               uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
       Name             string    `gorm:"not null"`
       Slug             string    `gorm:"unique;not null"`
       LicenseKey       string    // Link to existing device licensing
       SubscriptionTier string    `gorm:"default:'basic'"`
       MaxUsers         int       `gorm:"default:10"`
       MaxProjects      int       `gorm:"default:5"`
       Features         datatypes.JSON `gorm:"default:'[]'"`
   }
   ```

2. **Enhanced Error Handling & Response Format**
   ```go
   type APIResponse struct {
       Success   bool        `json:"success"`
       Data      interface{} `json:"data,omitempty"`
       Error     *APIError   `json:"error,omitempty"`
       Message   string      `json:"message,omitempty"`
       RequestID string      `json:"request_id"`
       Timestamp time.Time   `json:"timestamp"`
   }
   
   type APIError struct {
       Code    string                 `json:"code"`
       Message string                 `json:"message"`
       Details map[string]interface{} `json:"details,omitempty"`
   }
   ```

2. **Request Validation Middleware**
   ```go
   func ValidationMiddleware() gin.HandlerFunc {
       return gin.HandlerFunc(func(c *gin.Context) {
           // Validate request format, size, content-type
           // Sanitize inputs
           // Add request ID for tracing
       })
   }
   ```

3. **Database Schema Extensions**
   ```sql
   -- Add missing tables for projects, users, alerts
   -- Create proper indexes
   -- Add constraints and foreign keys
   ```

3. **JWT Authentication Service (Industry Standard)**
   ```go
   type TokenPair struct {
       AccessToken  string `json:"access_token"`  // 15 minutes
       RefreshToken string `json:"refresh_token"` // 7 days
   }

   type JWTClaims struct {
       UserID         string   `json:"user_id"`
       Email          string   `json:"email"`
       Role           string   `json:"role"`
       OrganizationID string   `json:"org_id"`
       Permissions    []string `json:"permissions"`
       jwt.RegisteredClaims
   }

   type AuthService struct {
       userRepo        UserRepository
       passwordService *PasswordService  // Argon2id implementation
       jwtService      *JWTService
       sessionService  *SessionService   // Redis-backed
   }
   ```

4. **Database Schema Enhancement (Preserve Current + Add)**
   ```sql
   -- KEEP ALL EXISTING TABLES (6 tables working perfectly):
   -- file_uploads, config_data, dinsight_data, feature_data, experiments, monitor_data

   -- ADD ENTERPRISE TABLES:
   CREATE TABLE organizations (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name VARCHAR(255) NOT NULL,
       slug VARCHAR(100) UNIQUE NOT NULL,
       license_key VARCHAR(500), -- Link to existing device licensing
       subscription_tier VARCHAR(50) DEFAULT 'basic',
       max_users INTEGER DEFAULT 10,
       max_projects INTEGER DEFAULT 5,
       features JSONB DEFAULT '[]',
       created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE users (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       email VARCHAR(255) UNIQUE NOT NULL,
       password_hash VARCHAR(255) NOT NULL,
       organization_id UUID REFERENCES organizations(id),
       role user_role NOT NULL DEFAULT 'user',
       is_active BOOLEAN DEFAULT true,
       failed_login_attempts INTEGER DEFAULT 0,
       locked_until TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enhance existing tables with user/project context
   ALTER TABLE file_uploads ADD COLUMN project_id UUID REFERENCES projects(id);
   ALTER TABLE file_uploads ADD COLUMN user_id UUID REFERENCES users(id);
   ```

### Phase 2: RBAC & Project Management (Week 2-3)
**Priority: High - Add Enterprise Features**

1. **Role-Based Access Control (RBAC)**
   ```go
   type Role string
   const (
       RoleSystemAdmin Role = "system_admin"    // Full system access
       RoleOrgAdmin    Role = "org_admin"       // Organization management
       RoleProjectLead Role = "project_lead"    // Project management
       RoleAnalyst     Role = "analyst"         // Data analysis
       RoleViewer      Role = "viewer"          // Read-only access
   )

   type Permission string
   const (
       // Data permissions
       PermissionDataRead     Permission = "data:read"
       PermissionDataWrite    Permission = "data:write"
       PermissionDataDelete   Permission = "data:delete"
       PermissionDataExport   Permission = "data:export"
       
       // Project permissions
       PermissionProjectCreate Permission = "project:create"
       PermissionProjectManage Permission = "project:manage"
       PermissionProjectDelete Permission = "project:delete"
       
       // System permissions
       PermissionSystemConfig Permission = "system:config"
       PermissionUserManage   Permission = "user:manage"
       PermissionLicenseView  Permission = "license:view"
   )
   ```

2. **Backward Compatibility Strategy**
   ```go
   // All existing endpoints remain functional with optional authentication
   func AuthOptionalMiddleware() gin.HandlerFunc {
       return func(c *gin.Context) {
           // Try to authenticate, but don't require it
           if token := c.GetHeader("Authorization"); token != "" {
               user, err := auth.ValidateToken(token)
               if err == nil {
                   c.Set("user", user)
               }
           }
           c.Next()
       }
   }

   // Enhanced existing handlers preserve functionality
   func (h *UploadHandler) HandleFileUpload(c *gin.Context) {
       // Get user from context (optional for backward compatibility)
       user := auth.GetUserFromContext(c) // Can be nil
       
       // Existing logic works unchanged
       // If user exists, associate with upload
       if user != nil {
           fileUpload.UserID = &user.ID
       }
       
       // ... rest of existing logic unchanged
   }
   ```

3. **Feature Flags for Gradual Rollout**
   ```go
   type FeatureFlags struct {
       AuthRequired    bool `env:"AUTH_REQUIRED" default:"false"`
       MFARequired     bool `env:"MFA_REQUIRED" default:"false"`
       ProjectsEnabled bool `env:"PROJECTS_ENABLED" default:"false"`
   }
   ```
       Password  string    `json:"-" gorm:"not null"`
       FirstName string    `json:"first_name"`
       LastName  string    `json:"last_name"`
       Role      string    `json:"role" gorm:"default:user"`
       IsActive  bool      `json:"is_active" gorm:"default:true"`
       CreatedAt time.Time `json:"created_at"`
       UpdatedAt time.Time `json:"updated_at"`
   }
   ```

2. **JWT Authentication**
   ```go
   type AuthService struct {
       jwtSecret     []byte
       tokenExpiry   time.Duration
       refreshExpiry time.Duration
   }
   
   func (s *AuthService) GenerateTokens(user *User) (string, string, error)
   func (s *AuthService) ValidateToken(token string) (*Claims, error)
   ```

3. **RBAC Implementation**
   ```go
   type Permission string
   type Role struct {
       Name        string       `json:"name"`
       Permissions []Permission `json:"permissions"`
   }
   
   func RequirePermission(perm Permission) gin.HandlerFunc
   ```

### Phase 3: Project & Dataset Management (Week 3-4)
**Priority: High**

1. **Project Management Handlers**
   ```go
   type ProjectHandler struct {
       projectService *ProjectService
   }
   
   func (h *ProjectHandler) CreateProject(c *gin.Context)
   func (h *ProjectHandler) GetProjects(c *gin.Context)
   func (h *ProjectHandler) UpdateProject(c *gin.Context)
   func (h *ProjectHandler) DeleteProject(c *gin.Context)
   ```

2. **Enhanced Dataset Handlers**
   ```go
   type DatasetHandler struct {
       datasetService *DatasetService
       validator      *Validator
   }
   
   func (h *DatasetHandler) GetDatasets(c *gin.Context)
   func (h *DatasetHandler) GetDatasetPreview(c *gin.Context)
   func (h *DatasetHandler) ValidateDataset(c *gin.Context)
   ```

3. **Data Quality Service**
   ```go
   type DataQualityService struct{}
   
   func (s *DataQualityService) AnalyzeQuality(datasetID string) (*QualityReport, error)
   func (s *DataQualityService) GetQualityScore(data [][]string) float64
   ```

### Phase 4: Async Job Processing (Week 4-5)
**Priority: Medium**

1. **Async Job Processing**
   ```go
   type JobQueue struct {
       redis  *redis.Client
       workers int
   }
   
   func (q *JobQueue) EnqueueJob(job *Job) error
   func (q *JobQueue) ProcessJobs(ctx context.Context)
   ```

### Phase 5: Industrial Real-time Monitoring & Alert Management (Week 5-7)
**Priority: HIGH - Business Critical for Industrial Operations**

1. **Industrial Data Streaming Pipeline**
   ```go
   type IndustrialStreamHandler struct {
       bufferSize       int
       maxPointsPerSec  int
       activeSessions   map[string]*MachineSession
   }
   
   // Handle continuous sensor data from industrial machines
   func (h *IndustrialStreamHandler) StreamMachineData(c *gin.Context)  // WebSocket /api/v1/ws
   func (h *IndustrialStreamHandler) ProcessDataPoint(machineID string, data SensorData)
   func (h *IndustrialStreamHandler) BufferDataDuringOutage(machineID string, data []SensorData)
   func (h *IndustrialStreamHandler) GetMachineStatus(c *gin.Context)   // GET /api/v1/stream/:machine_id/status
   ```

2. **Production Alert Management System**
   ```go
   type IndustrialAlertManager struct {
       alertRules       map[string]AlertRule
       escalationChains map[string]EscalationChain
       maintenanceMode  map[string]bool
   }
   
   // Intelligent alerting for equipment failures
   func (m *IndustrialAlertManager) ProcessEquipmentAlert(alert EquipmentAlert) error
   func (m *IndustrialAlertManager) EscalateToSupervisor(alertID string) error
   func (m *IndustrialAlertManager) SuppressMaintenanceAlerts(machineID string, duration time.Duration)
   func (m *IndustrialAlertManager) AnalyzeAlertPatterns(machineID string) PatternAnalysis
   ```

3. **Multi-Channel Notification Service**
   ```go
   type NotificationService struct {
       emailService    EmailNotifier
       smsService      SMSNotifier
       webhookService  WebhookNotifier
       pushService     PushNotifier
   }
   
   // Critical equipment failure notifications
   func (s *NotificationService) SendEquipmentFailureEmail(alert EquipmentAlert, recipients []string)
   func (s *NotificationService) SendCriticalSMS(alert EquipmentAlert, phoneNumbers []string)
   func (s *NotificationService) TriggerCMMSWebhook(alert EquipmentAlert, workOrderData WorkOrder)
   func (s *NotificationService) ConfirmDelivery(notificationID string) DeliveryStatus
   ```

4. **Enhanced Anomaly Detection with Industrial Context**
   ```go
   type IndustrialAnomalyDetector struct {
       threshold       float64
       machineProfiles map[string]MachineProfile
   }
   
   // Equipment-specific anomaly detection
   func (d *IndustrialAnomalyDetector) DetectEquipmentAnomalies(machineID string, data [][]float64) []bool
   func (d *IndustrialAnomalyDetector) CalculateMahalanobisDistance(point, mean []float64, invCov [][]float64) float64
   func (d *IndustrialAnomalyDetector) GetEquipmentBaseline(machineID string) BaselineData
   ```

5. **Industrial Dashboard Backend**
   ```go
   type IndustrialDashboardService struct {
       metricsCalculator OEECalculator
       configManager     DashboardConfigManager
       reportGenerator   ShiftReportGenerator
   }
   
   // Multi-machine performance dashboards
   func (s *IndustrialDashboardService) GetFactoryOverview(c *gin.Context)     // GET /api/v1/dashboard/stats
   func (s *IndustrialDashboardService) GetEquipmentTrends(c *gin.Context)     // GET /api/v1/dashboard/charts
   func (s *IndustrialDashboardService) CalculateOEE(machineID string) OEEMetrics
   func (s *IndustrialDashboardService) GenerateShiftReport(shiftID string) ShiftReport
   func (s *IndustrialDashboardService) GetComplianceData(c *gin.Context)      // GET /api/v1/dashboard/compliance
   ```

6. **Essential Data Export with Industrial Context**
   ```go
   type IndustrialExportHandler struct {
       authService *auth.AuthService
   }
   
   // Industrial data export with equipment metadata
   func (h *IndustrialExportHandler) ExportEquipmentDataCSV(c *gin.Context)    // GET /api/v2/export/equipment/:id/csv
   func (h *IndustrialExportHandler) ExportShiftReportJSON(c *gin.Context)     // GET /api/v2/export/shift-report/:id/json
   func (h *IndustrialExportHandler) ExportComplianceDataCSV(c *gin.Context)   // GET /api/v2/export/compliance/:id/csv
   func (h *IndustrialExportHandler) ExportMaintenanceLogCSV(c *gin.Context)   // GET /api/v2/export/maintenance/:id/csv
   func (h *IndustrialExportHandler) ExportOEEReportJSON(c *gin.Context)       // GET /api/v2/export/oee-report/:id/json
   ```

   **Industrial Implementation Features:**
   - Real-time data streaming for 50+ concurrent machines
   - Equipment-specific alert configurations and escalation chains
   - Multi-channel notifications (email, SMS, webhooks, push) for 24/7 operations
   - Industrial dashboard with OEE metrics and compliance reporting
   - CMMS integration and maintenance workflow automation
   - Regulatory compliance data export and audit trail capabilities
   - ~3 weeks implementation (justified by preventing $50,000+ per hour downtime costs)

### Phase 6: System Health & Metrics (Week 6)
**Priority: Low**

1. **Health Check System**
   ```go
   type HealthChecker struct {
       checks map[string]HealthCheck
   }
   
   func (h *HealthChecker) AddCheck(name string, check HealthCheck)
   func (h *HealthChecker) GetStatus() *SystemHealth
   ```

2. **Metrics Collection**
   ```go
   type MetricsCollector struct {
       registry *prometheus.Registry
   }
   
   func (m *MetricsCollector) RecordAPICall(endpoint, method, status string, duration time.Duration)
   ```

## Implementation Guidelines

### Code Structure
```
Dinsight_API/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── auth/                 # Authentication & authorization
│   ├── database/             # Database connection & migrations
│   ├── handler/              # HTTP handlers
│   ├── middleware/           # HTTP middleware
│   ├── model/                # Data models
│   ├── service/              # Business logic
│   ├── repository/           # Data access layer
│   ├── validator/            # Input validation
│   ├── websocket/            # WebSocket handling
│   └── worker/               # Background job processing
├── pkg/
│   ├── errors/               # Custom error types
│   ├── logger/               # Structured logging
│   ├── response/             # Standard response formats
│   └── utils/                # Utility functions
├── migrations/               # Database migrations
├── docs/                     # API documentation
└── tests/                    # Test files
```

### Testing Strategy
```go
// Unit tests for each service
func TestProjectService_CreateProject(t *testing.T)
func TestAuthService_GenerateTokens(t *testing.T)

// Integration tests for API endpoints
func TestProjectAPI_CreateProject(t *testing.T)
func TestAuthAPI_Login(t *testing.T)

// Performance tests
func BenchmarkDataProcessing(b *testing.B)
```

### API Documentation
```yaml
# OpenAPI 3.0 specification
openapi: 3.0.0
info:
  title: Dinsight API
  version: 2.0.0
  description: Predictive maintenance and anomaly detection platform
paths:
  /api/v1/projects:
    get:
      summary: List projects
      parameters:
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
```

## Migration Strategy

### Database Migration Plan
1. **Create new tables** for missing entities
2. **Migrate existing data** to new schema
3. **Add indexes** for performance
4. **Update foreign key** relationships

### API Versioning
1. **Maintain v1** endpoints for backward compatibility
2. **Introduce v2** endpoints with enhanced features
3. **Deprecation timeline** for v1 (6 months notice)

### Deployment Strategy
1. **Feature flags** for gradual rollout
2. **Blue-green deployment** for zero downtime
3. **Database migrations** in separate deployment step
4. **Rollback procedures** for quick recovery

## Success Metrics

### Performance Targets
- **API Response Time**: < 200ms for 95% of requests
- **Database Query Time**: < 100ms for most queries
- **File Upload**: Support up to 1GB files
- **Concurrent Users**: Handle 1000+ concurrent users

### Quality Metrics
- **Test Coverage**: > 85% for critical paths
- **API Documentation**: 100% endpoint coverage
- **Error Rate**: < 0.1% for production APIs
- **Uptime**: 99.9% availability target

This enhancement plan provides a comprehensive roadmap for transforming the current basic API into a production-ready, enterprise-grade platform that meets all the requirements outlined in the design document.
