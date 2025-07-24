# Dinsight Platform - AI Coding Agent Instructions

## Project Overview
Dinsight is a **dimensionality reduction and monitoring platform** that processes industrial data through custom algorithms to provide 2D visualizations and real-time anomaly detection for predictive maintenance.

## Architecture & Core Components

### Current Structure
- **Backend API**: Go/Gin framework with PostgreSQL database
- **Processing Engine**: Custom dimensionality reduction algorithms in `internal/processor/`
- **Monitoring System**: Real-time data projection in `internal/dinsightmon/`
- **License Management**: Device-based licensing system in `pkg/license/`

### Key Data Flow
1. **File Upload** → CSV processing → Feature extraction → Store in `FileUpload`
2. **Processing** → Load config from `ConfigData` → Run algorithm → Store 2D coordinates in `DinsightData`
3. **Monitoring** → Project new data onto existing baseline → Store results in `MonitorData`

## Critical Development Patterns

### Database Models & Relationships
- Use `uint` primary keys with GORM `Base` struct (includes `ID`, `CreatedAt`, `UpdatedAt`, `DeletedAt`)
- PostgreSQL arrays: `pq.Float64Array` for coordinates, `pq.StringArray` for file lists
- Key models: `FileUpload`, `DinsightData`, `FeatureData`, `MonitorData`, `ConfigData`, `Experiment`
- Soft deletes enabled through `gorm.DeletedAt` in base model

### API Architecture
- **Single API version** (`/api/v1`) with license middleware on all routes
- Response format using `pkg/response` with success/error structure
- Swagger documentation at `/swagger/*any` endpoint
- All routes require valid license verification

### Middleware Stack
- **CORS** → **License Validation** (device-based licensing system)
- License middleware checks device registration and license validity
- Caching system for license validation to avoid repeated checks

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

### License Management
- Device-based licensing in `pkg/license/` - validates hardware fingerprints
- License middleware applied to ALL `/api/v1` routes (no public endpoints)
- License validation with caching to reduce overhead
- Device registration required with license verification on startup

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
```

Focus on understanding the distance-based algorithms in `processor/` and `dinsightmon/` directories - these implement the core mathematical logic that differentiates this platform from standard ML frameworks.
