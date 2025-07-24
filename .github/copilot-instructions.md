# Dinsight Platform - AI Coding Agent Instructions

## Project Overview
Dinsight is a **predictive maintenance platform** combining machine learning-powered dimensionality reduction with real-time anomaly detection. The system processes industrial data through advanced algorithms to provide 2D visualizations and monitoring capabilities for equipment failure prediction.

## Architecture & Core Components

### Microservices Structure
- **Backend API**: Go/Gin framework with PostgreSQL database
- **Processing Engine**: Custom dimensionality reduction algorithms (similar to t-SNE/UMAP)
- **Monitoring System**: Real-time anomaly detection with alert management
- **Authentication**: JWT-based RBAC with 5 roles and 8 granular permissions

### Key Data Flow
1. **File Upload** → CSV/Excel processing → Feature extraction
2. **Baseline Training** → Dimensionality reduction → 2D coordinate generation  
3. **Real-time Monitoring** → New data projection → Anomaly detection → Alerts

## Critical Development Patterns

### Database Models & Relationships
- Use UUID primary keys for all enterprise entities (`model.User`, `model.Project`, etc.)
- PostgreSQL arrays for numerical data: `pq.Float64Array` for coordinates, `pq.StringArray` for metadata
- GORM associations: `User` ↔ `Project` (ownership), `Project` ↔ `Dataset`, `Project` ↔ `Alert`
- Soft deletes with `gorm.DeletedAt` for audit trails

### API Architecture
- **V1 Routes** (`/api/v1`): Legacy endpoints with license middleware for backward compatibility
- **V2 Routes** (`/api/v2`): Enterprise features with full authentication, validation, rate limiting
- Standard response format in `internal/response/response.go` with success/error structure
- Swagger documentation auto-generated from handler annotations

### Middleware Stack (Applied in Order)
1. **CORS** → **Request Logging** → **Error Handling** → **Validation** → **Rate Limiting** → **Authentication**
2. Rate limiters by endpoint type: Auth (10/min), Upload (10/min), Processing (5/min), General (100/min)
3. Token bucket algorithm in `internal/middleware/rate_limit.go`

### Authentication Flow
- JWT tokens: 15-min access + 7-day refresh tokens
- Account lockout: 5 failed attempts = 15-min lockout
- Role hierarchy: Admin → Manager → Analyst → Viewer → User
- Permission validation in middleware: `authMiddleware.RequirePermission(model.PermissionReadData)`

## Core Processing Algorithms

### Dimensionality Reduction Pipeline
- **File Processing**: `internal/processor/processor.go` - Main algorithm entry point
- **Distance Calculation**: `MakeNDDistanceMatrix()` → normalize → apply distance function
- **Optimization**: SDG+Momentum or Adam optimizers for 2D projection convergence
- **Parameters**: Configuration in `model.ConfigData` (gamma0, w1/w2/a, optimizer settings)

### Monitoring System
- **Real-time Processing**: `internal/dinsightmon/monitor.go` - Projects new data onto existing 2D space
- **Similarity Calculation**: Compare new vectors to reference baseline using distance functions
- **Coordinate Generation**: Optimization loop to find 2D position maintaining distance relationships

## Development Workflows

### Database Operations
```bash
# Run migrations (required on first setup)
go run cmd/migrate/main.go

# Database config in config/config.go - update credentials before running
```

### Processing Configuration
- Algorithm parameters stored in `config_data` table, loaded dynamically
- Key parameters: `gamma0` (convergence threshold), `w1/w2/a` (distance function), optimizer choice
- Debug output: Distance matrices written to CSV files for validation

### Testing Patterns
- Unit tests for error handling: `internal/errors/errors_test.go`
- Model validation tests with relationship preloading
- Rate limiting tests with concurrent requests
- Use `database.GetDB()` for database access in handlers

### Debugging Tips
- Use `internal/logging/error_logger.go` for structured error logging.
- Debugging distance functions: Add debug logs in `internal/dinsightmon/distanceFuncLib/`.
- Monitor real-time processing logs in `internal/dinsightmon/monitor.go`.

## Security & Validation

### Input Validation
- Custom validators in `internal/validation/validators.go`: UUID, email, password strength, enums
- File upload validation: 100MB limit, type checking, virus scanning interface
- SQL injection prevention with GORM prepared statements
- XSS protection headers in validation middleware

### Error Handling
- Structured errors in `internal/errors/errors.go` with types, codes, severity levels
- Circuit breaker pattern for external service resilience
- Panic recovery with structured error conversion
- Development vs production error detail filtering

## Integration Points

### License Management
- Device-based licensing with `pkg/license/` - validates hardware fingerprints
- License middleware applied to V1 routes only
- Public endpoints (health checks) bypass license validation

### File Processing
- Multi-format support: CSV, Excel, JSON with metadata extraction
- Chunked uploads for large files (5MB chunks, resumable)
- Progress tracking stored in database with status updates

### External APIs
- Webhooks for alert notifications: Implemented in `internal/export/webhooks.go`.
- Integration API for exporting data: See `internal/export/integration_api.go`.

## Common Gotchas

1. **Array Handling**: Use `pq.Float64Array` for PostgreSQL arrays, not Go slices in GORM models
2. **Middleware Order**: Authentication must come before permission checks
3. **UUID Validation**: Always validate UUID parameters in URL paths with middleware
4. **Rate Limiting**: Different endpoints have different rate limits - use appropriate middleware
5. **Database Config**: Processing algorithms load config from DB, not static files
6. **CORS**: V1 routes have custom CORS, V2 routes use standard middleware

## Quick Start Commands
```bash
# Install dependencies
go mod download

# Setup database
go run cmd/migrate/main.go

# Run server (localhost:8080)
go run cmd/api/main.go

# View API docs
open http://localhost:8080/swagger/index.html
```

Focus on understanding the distance-based algorithms in `processor/` and `dinsightmon/` directories - these implement the core mathematical logic that differentiates this platform from standard ML frameworks.
