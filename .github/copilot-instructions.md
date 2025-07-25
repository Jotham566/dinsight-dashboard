# Dinsight Platform - AI Coding Agent Instructions

## Project Overview
Dinsight is a **dimensionality reduction and monitoring platform** that processes industrial data through custom algorithms to provide 2D visualizations and real-time anomaly detection for predictive maintenance.

## Architecture & Core Components

### Current Structure
- **Backend API**: Go/Gin framework with PostgreSQL database + enterprise authentication
- **Frontend**: Next.js 15.3 + React 19 + TypeScript (planned in `/frontend` directory)
- **Processing Engine**: Custom dimensionality reduction algorithms in `internal/processor/`
- **Monitoring System**: Real-time data projection in `internal/dinsightmon/`
- **Authentication**: Dual-layer system (device licensing + user JWT/RBAC)

### Key Data Flow
1. **Authentication** → License validation → User JWT verification → RBAC permission check
2. **File Upload** → CSV processing → Feature extraction → Store in `FileUpload` (with user/org context)
3. **Processing** → Load config from `ConfigData` → Run algorithm → Store 2D coordinates in `DinsightData`
4. **Monitoring** → Project new data onto existing baseline → Store results in `MonitorData`

## Critical Development Patterns

### Enhanced Database Models & Multi-Tenancy
- **Base Model**: Use `uint` primary keys with GORM `Base` struct (includes `ID`, `CreatedAt`, `UpdatedAt`, `DeletedAt`)
- **Multi-Tenant Models**: `Organization`, `User`, `Project` with UUID primary keys
- **Core Data Models**: `FileUpload`, `DinsightData`, `FeatureData`, `MonitorData`, `ConfigData`
- **PostgreSQL Arrays**: `pq.Float64Array` for coordinates, `pq.StringArray` for file lists
- **Authentication Models**: `UserSession` with Redis-backed session management

### Dual-Layer API Architecture
- **Layer 1**: Device-based licensing (`middleware.LicenseMiddleware`) - ALL routes require valid license
- **Layer 2**: User authentication (`authMiddleware.OptionalAuth()` or `RequireAuth()`)
- **Single API version** (`/api/v1`) with enterprise middleware stack
- **Response format**: Structured JSON using `pkg/response` with success/error handling
- **Documentation**: Swagger/OpenAPI at `/swagger/*any` endpoint

### Enterprise Middleware Stack
```go
// Middleware chain in internal/routes/routes.go
r.Use(intMiddleware.PanicRecovery())          // Panic recovery
r.Use(RequestIDMiddleware())                  // Request tracking
r.Use(CORSMiddleware())                       // CORS handling
r.Use(intMiddleware.ErrorHandler())           // Error handling
api.Use(middleware.LicenseMiddleware())       // Layer 1: Device licensing
api.Use(authMiddleware.OptionalAuth())        // Layer 2: User auth (backward compatible)
```

## Enterprise Authentication & Security System

### Dual-Layer Authentication Architecture
- **Layer 1**: RSA-based device licensing (`pkg/license/`) - validates `license.lic` file with hardware fingerprinting
- **Layer 2**: JWT user authentication (`internal/auth/`) with Argon2id password hashing and Redis sessions
- **Backward Compatibility**: All existing endpoints preserved; authentication is optional but RBAC-aware
- **Multi-Tenancy**: Organization-level data isolation with 5-tier role hierarchy

### Authentication Workflow
```go
// Get authenticated user from context (may be nil for backward compatibility)
user := auth.GetUserFromContext(c)
if user != nil {
    // Associate operations with user/organization
    fileUpload.UserID = &user.ID
    fileUpload.OrganizationID = user.OrganizationID
}
```

### Role-Based Access Control (RBAC)
- **system_admin**: Full system access across all organizations
- **org_admin**: Organization management and all org data
- **project_lead**: Project management within organization
- **analyst**: Data analysis capabilities within assigned projects
- **viewer**: Read-only access to assigned data

### Session Management
- **Redis-backed sessions** for horizontal scalability
- **JWT tokens**: 15-minute access tokens, 7-day refresh tokens
- **Session context**: Available via `auth.GetSessionIDFromContext(c)`
- **Multi-device support**: Track sessions per user with device fingerprinting

## Core Processing Algorithms

### Dimensionality Reduction Pipeline
- **Main Entry Point**: `internal/processor/processor.go` - Core algorithm implementation
- **Configuration**: Loaded from database `ConfigData` table, not static files
- **Key Parameters**: `gamma0` (convergence), `optimizer` (adam/sgd), `alpha`, dimension ranges
- **Distance Functions**: Custom implementations in `processor/distance.go` and `processor/functions.go`
- **Output**: 2D coordinates stored as `pq.Float64Array` in `DinsightData` table

### Monitoring System
- **Real-time Processing**: `internal/dinsightmon/monitor.go` - Projects new data onto existing baseline
- **Distance Libraries**: Custom functions in `dinsightmon/distanceFuncLib/` and `dinsightmon/funcLib/`
- **Optimizer Integration**: Uses same optimizers as processing pipeline from `internal/math/optimizer/`
- **Result Storage**: Monitoring coordinates and metadata stored in `MonitorData` table

## Development Workflows

### Database Operations
```bash
# Migrations run automatically on startup via database.RunMigrations()
# No separate migrate command - handled in main.go
go run cmd/api/main.go
```

### Configuration Management
- Processing config stored in `config_data` table, loaded dynamically
- Default config initialized automatically in `database.InitializeDefaultConfig()`
- Key editable fields: `gamma0`, `optimizer`, `alpha`, `end_meta`, dimension ranges
- Non-editable system parameters: `imax`, `lowdim`, `eta`, `epsilon`, optimizer params

### File Processing Workflow
1. Upload via `/api/v1/analyze` endpoint
2. Files stored locally, metadata in `file_uploads` table
3. Processing triggered automatically, results in `dinsight_data` table
4. Monitor new data via `/api/v1/monitor/{dinsight_id}` endpoint

## Security & Integration

### Enterprise License Management
- Device-based licensing in `pkg/license/` - validates hardware fingerprints
- License middleware applied to ALL `/api/v1` routes (no public endpoints)
- License validation with caching to reduce overhead
- Device registration required with license verification on startup

### User Authentication Endpoints
```go
// Authentication routes in internal/routes/routes.go
auth.POST("/register", authHandler.Register)
auth.POST("/login", authHandler.Login)
auth.POST("/refresh", authHandler.RefreshToken)
auth.POST("/logout", authMiddleware.RequireAuth(), authHandler.Logout)
auth.GET("/me", authMiddleware.RequireAuth(), authHandler.GetMe)
```

### Input Validation
- File upload limits: 100MB max size defined in handlers
- CSV processing with error handling for malformed data
- PostgreSQL array validation for coordinate data
- GORM model validation through struct tags

### Error Handling
- Structured responses using `pkg/response` package
- Standard HTTP status codes with descriptive messages
- Database connection error handling with proper logging
- License validation errors with clear user feedback

## Frontend Architecture (Planned)

### Next.js 15.3 + React 19 Stack
- **Location**: `/frontend` directory (currently empty, ready for setup)
- **Framework**: Next.js 15.3 with App Router and TypeScript 5.6
- **UI Library**: Material-UI v6 or Ant Design v5 for components
- **State Management**: Redux Toolkit or Zustand for global state
- **Charts**: Recharts or D3.js for data visualizations
- **Build Tool**: Turbopack for development, Next.js built-in for production

### Frontend-Backend Integration
- **API Communication**: Axios with React Query for data fetching
- **Authentication**: JWT tokens in HTTP-only cookies or localStorage
- **Real-time Updates**: WebSocket or Server-Sent Events for live data
- **Development URL**: `http://localhost:3000` → `http://localhost:8080/api/v1`

## Integration Points

### File Processing
- Multi-file upload support with merge capabilities
- CSV parsing with feature extraction and metadata handling
- Local file storage (configurable path in handlers)
- Progress tracking via database status fields

### Database Access Patterns
- Single database connection via `database.GetDB()`
- GORM models with PostgreSQL-specific features (arrays, JSONB)
- Automatic timestamp management through `Base` model
- Soft delete support for audit trails

## Common Gotchas

1. **Array Handling**: Always use `pq.Float64Array` and `pq.StringArray` for PostgreSQL arrays
2. **License Requirement**: ALL v1 routes require valid license - no bypass mechanism
3. **Configuration Loading**: Processing config comes from database, not JSON files
4. **File Paths**: Ensure proper path handling for uploaded files and outputs
5. **Database Initialization**: Migrations and default config run automatically on startup
6. **Monitor Data**: Requires existing `DinsightData` as reference for projection
7. **Authentication Context**: Use `auth.GetUserFromContext(c)` - may return `nil` for backward compatibility
8. **RBAC Permissions**: Check user permissions with `authMiddleware.RequirePermission()` or `RequireRole()`
9. **Session Management**: Redis is optional - authentication degrades gracefully without it
10. **Multi-Tenancy**: Always filter data by `organization_id` when user context exists

## Quick Start Commands
```bash
# Update database credentials in config/config.go
# Install dependencies
go mod download

# Run server (automatically handles migrations and config)
go run cmd/api/main.go

# View API docs
open http://localhost:8080/swagger/index.html

# Key endpoints to test
curl -X POST localhost:8080/api/v1/analyze -F "files=@test.csv"
curl localhost:8080/api/v1/config

# Authentication endpoints
curl -X POST localhost:8080/api/v1/auth/register -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","first_name":"Test","last_name":"User"}'
curl -X POST localhost:8080/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Frontend setup (when ready)
cd frontend && npm install && npm run dev
```

Focus on understanding the distance-based algorithms in `processor/` and `dinsightmon/` directories - these implement the core mathematical logic that differentiates this platform from standard ML frameworks. The dual-layer authentication preserves existing licensing while adding enterprise user management.
