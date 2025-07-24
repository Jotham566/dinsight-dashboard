# Dinsight Platform - Design Document

## Overview

Dinsight Platform is a comprehensive **predictive maintenance solution** designed for businesses that require advanced anomaly detection and monitoring capabilities. The platform combines machine learning-powered dimensionality reduction with real-time monitoring to provide actionable insights for industrial and business applications.

## Target Market

- **Primary**: Manufacturing companies, industrial facilities, and energy companies requiring predictive maintenance
- **Secondary**: Data science teams, quality assurance departments, and operations managers
- **End Users**: Non-technical operators, maintenance engineers, and decision makers

## Architecture Philosophy

### Microservices Architecture
- **Backend API**: Go-based REST API with PostgreSQL database
- **Frontend**: Modern React-based SPA with real-time capabilities
- **Processing Engine**: Asynchronous job processing for heavy computations
- **Monitoring Service**: Real-time anomaly detection and alerting

### Technology Stack

#### Backend (Go)
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL with GORM ORM
- **Documentation**: Swagger/OpenAPI 3.0
- **Authentication**: Dual-layer (Device licensing + User JWT)
- **Security**: Argon2id password hashing, RBAC, MFA support
- **Processing**: Go routines for async processing
- **Containerization**: Docker with multi-stage builds

#### Frontend (Next.js)
- **Framework**: Next.js 15.3 with React 19 and TypeScript 5.6
- **State Management**: Redux Toolkit / Zustand
- **UI Library**: Material-UI v6 or Ant Design v5
- **Charts**: Recharts or D3.js for advanced visualizations
- **Real-time**: WebSocket or Server-Sent Events
- **Build Tool**: Next.js built-in build system (Turbopack for development)

#### Infrastructure
- **Database**: PostgreSQL 15+ (for JSON support and arrays)
- **Caching**: Redis for session management and job queues
- **File Storage**: Local filesystem or S3-compatible storage
- **Monitoring**: Prometheus + Grafana
- **Deployment**: Docker Compose for development, Kubernetes for production

## Core Features

### 1. Data Management System
- **Multi-format Upload**: CSV, Excel, JSON data ingestion
- **Data Validation**: Schema validation, type checking, anomaly pre-screening
- **File Organization**: Project-based file management with metadata tracking
- **Data Pipeline**: ETL processes with data cleaning and normalization

### 2. Dinsight Coordinate Processing
- **Coordinate Data Processing**: Analysis of dinsight_x and dinsight_y coordinate pairs from dimensionality reduction
- **Baseline Dataset Management**: Reference dataset storage and statistical analysis for comparison
- **Configuration Management**: Processing parameters (gamma0, optimizer, alpha) for coordinate generation
- **Dataset Compatibility Validation**: Statistical validation and consistency checking between datasets

### 3. Mahalanobis Anomaly Detection System
- **Statistical Analysis**: Centroid and covariance matrix calculation from baseline datasets
- **Adaptive Threshold Control**: Sensitivity factor adjustment (0.5x to 5.0x) with real-time threshold updates
- **Distance Calculation**: Mahalanobis distance computation for monitoring points against baseline statistics
- **Classification & Reporting**: Binary anomaly classification with percentage reporting and distribution analysis

### 4. Feature Data Analysis & Visualization
- **Feature Data Management**: Loading and processing of raw feature data with metadata integration
- **Sample-based Analysis**: Individual sample exploration with participant and segment metadata
- **Multi-strategy Data Loading**: Intelligent ID resolution for feature data access across multiple API endpoints
- **Feature Distribution Analysis**: Value plotting and comparative analysis across samples

### 5. Interactive Data Visualization Engine
- **Multi-chart Plotting**: Scatter plots, side-by-side comparisons, and anomaly detection overlays
- **Real-time Chart Updates**: Dynamic visualization updates with zoom, pan, and export capabilities
- **Distance Distribution Visualization**: Histogram generation for Mahalanobis distance analysis
- **Statistical Overlays**: Centroid markers, threshold circles, and density contour plotting

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend API   │
│   (Next.js)     │◄──►│   (Nginx)       │◄──►│   (Go/Gin)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Storage  │    │   Message Queue │    │   PostgreSQL    │
│   (S3/Local)    │    │   (Redis)       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Monitoring    │    │   Processing    │
                       │   Service       │    │   Workers       │
                       └─────────────────┘    └─────────────────┘
```

## API Design Principles

### RESTful Design
- Resource-based URLs (`/api/v1/datasets/{id}`)
- HTTP methods for operations (GET, POST, PUT, DELETE)
- Consistent response formats
- Proper HTTP status codes

### Error Handling
- Structured error responses
- Error codes for client handling
- Detailed error messages for debugging
- Input validation with clear feedback

### Performance
- Pagination for large datasets
- Compression for API responses
- Caching strategies for frequently accessed data
- Async processing for heavy operations

## Data Models

### Core Entities
**Enterprise Multi-Tenant Architecture:**
1. **Organization**: Multi-tenant container with licensing integration
2. **User**: Enhanced with RBAC, MFA, and organization context
3. **Project**: Organization-scoped container for related datasets
4. **Dataset**: Uploaded data with user/project association
5. **Model**: Trained baseline models with access control
6. **MonitorSession**: Active monitoring configurations
7. **Alert**: Anomaly detection results with notification workflows

### Database Schema Design
- Normalized structure for data integrity
- JSON columns for flexible metadata
- Array columns for efficient numerical data storage
- Indexing strategy for performance
- Audit trails for data lineage

## Enhanced Security Architecture

### Dual-Layer Authentication Strategy
**Preserving Existing Investment while Adding Enterprise Features:**

#### Layer 1: Device-Based Licensing (Preserved)
- **RSA-based JWT license validation** with embedded public key
- **Device fingerprinting and registration** management
- **License expiration tracking** with cache optimization
- **Production-ready licensing middleware** already implemented

#### Layer 2: User Authentication (New)
- **JWT-based user authentication** with access/refresh tokens
- **Argon2id password hashing** (industry best practice 2025)
- **Multi-factor authentication** support (TOTP + SMS)
- **Redis-backed session management** for scalability

### Role-Based Access Control (RBAC)
```
system_admin  -> Full system access
org_admin     -> Organization management
project_lead  -> Project management
analyst       -> Data analysis capabilities
viewer        -> Read-only access
```

### Multi-Tenant Security
- **Organization-level data isolation**
- **Project-based access control**
- **User permission inheritance** from organization settings
- **Feature flag control** per organization subscription

### Enterprise Security Features
- **Account lockout** after failed attempts (15 min lockout)
- **Password policy enforcement** (12+ chars, complexity)
- **Session timeout** and management
- **API rate limiting** with token bucket algorithm
- **Input sanitization** and XSS protection
- **SQL injection prevention** with prepared statements
- Request/response logging
- Security headers

## Scalability Strategy

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Load balancing capabilities
- Microservices architecture

### Performance Optimization
- Database indexing strategy
- Query optimization
- Caching layers
- Async processing patterns

### Monitoring & Observability
- Application metrics
- Performance monitoring
- Error tracking
- User behavior analytics

## Development Workflow

### Environment Setup
- Dockerized development environment
- Database migrations and seeding
- Environment variable management
- Local development tools

### Code Quality
- Automated testing (unit, integration, e2e)
- Code linting and formatting
- Code review process
- Documentation standards

### CI/CD Pipeline
- Automated testing on commits
- Build and deployment automation
- Environment promotion strategy
- Rollback procedures

## Future Enhancements

### Phase 2 Features
- Machine learning model marketplace
- Advanced alerting with ML-based thresholds
- Integration with IoT devices
- Mobile application

### Scalability Improvements
- Multi-tenant architecture
- Cloud-native deployment
- Auto-scaling capabilities
- Global CDN integration

### AI/ML Enhancements
- AutoML capabilities
- Custom algorithm support
- Model explanation and interpretability
- Federated learning support

## Risk Mitigation

### Technical Risks
- Database performance at scale
- Real-time processing latency
- Data quality and validation
- Model accuracy degradation

### Business Risks
- User adoption challenges
- Competition from established players
- Regulatory compliance requirements
- Data privacy concerns

## Success Metrics

### Technical KPIs
- API response times < 200ms
- 99.9% uptime
- Zero data loss
- Sub-second anomaly detection

### Business KPIs
- User engagement metrics
- Feature adoption rates
- Customer satisfaction scores
- Revenue per customer
