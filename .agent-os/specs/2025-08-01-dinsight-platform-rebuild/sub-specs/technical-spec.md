# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-01-dinsight-platform-rebuild/spec.md

> Created: 2025-08-01  
> Version: 1.0.0

## Technology Stack

### Backend Stack
- **Language**: Go 1.21+
- **Framework**: Gin Web Framework v1.9+
- **ORM**: GORM v1.25+
- **Database**: PostgreSQL 14+
- **Authentication**: JWT-Go v5.0+
- **Documentation**: Swaggo/Gin-Swagger v1.6+
- **Testing**: Testify v1.8+
- **Validation**: Go-Playground/Validator v10.15+

### Frontend Stack
- **Framework**: Next.js 15.4.5 (App Router)
- **Runtime**: Node.js 20+ LTS
- **Language**: TypeScript 5.2+
- **Package Manager**: npm (with workspaces support)
- **UI Framework**: React 18+
- **Styling**: Tailwind CSS v3.4+
- **Component Library**: shadcn/ui
- **State Management**: React built-in state + custom hooks
- **HTTP Client**: Fetch API with custom wrapper
- **Testing**: Jest + React Testing Library
- **E2E Testing**: Playwright

### Database Technologies
- **Primary Database**: PostgreSQL 14+
- **Connection Pooling**: Built-in GORM connection pooling
- **Migrations**: GORM AutoMigrate + custom migration system
- **Backup**: PostgreSQL built-in backup tools

### Infrastructure & DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Cloud-native (Docker containers)
- **Static Assets**: CDN (Cloudflare or Vercel Edge)
- **Environment Management**: Environment variables + .env files

### Development Tools
- **API Documentation**: Swagger/OpenAPI 3.0
- **Code Formatting**: gofmt (Go), Prettier (Frontend)
- **Linting**: golangci-lint (Go), ESLint (Frontend)
- **Git Hooks**: Husky + lint-staged
- **IDE Support**: VS Code with Go and TypeScript extensions

## Architecture Decisions

### Backend Architecture Patterns

#### Clean Architecture Implementation
```go
// Layer separation
├── cmd/api/           # Application entry point
├── internal/
│   ├── domain/        # Business entities and interfaces
│   ├── usecases/      # Business logic implementation
│   ├── adapters/      # External adapters (handlers, repos)
│   └── infrastructure/ # Framework and drivers
└── pkg/               # Shared libraries
```

#### Dependency Injection
- Use constructor-based dependency injection
- Interface-based abstractions for testability
- Repository pattern for data access
- Service layer for business logic

#### Error Handling
- Custom error types with context
- Structured error responses (RFC 7807)
- Centralized error logging
- Graceful degradation strategies

### Frontend Architecture Patterns

#### Component Architecture
```typescript
├── app/                 # Next.js App Router
│   ├── (auth)/         # Route groups
│   ├── dashboard/      # Feature-based routing
│   └── globals.css     # Global styles
├── components/         # Reusable components
│   ├── ui/            # Base UI components (shadcn/ui)
│   ├── features/      # Feature-specific components
│   └── layouts/       # Layout components
├── hooks/             # Custom React hooks
├── lib/               # Utility functions and configurations
├── stores/            # State management
└── types/             # TypeScript type definitions
```

#### State Management Strategy
- Local component state for UI state
- Custom hooks for shared state
- React Context for global application state
- Server state managed by React Query (if needed)

#### Data Fetching Strategy
- Server-side rendering where appropriate
- Client-side fetching for dynamic data
- Optimistic updates for better UX
- Error boundaries for graceful error handling

## Database Design

### Core Entities

#### User Management
```sql
-- Users table with authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'analyst',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- User sessions for JWT refresh tokens
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    refresh_token VARCHAR(500) NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Enhanced File Management
```sql
-- Extended file uploads with user tracking
ALTER TABLE file_uploads ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE file_uploads ADD COLUMN project_name VARCHAR(255);
ALTER TABLE file_uploads ADD COLUMN description TEXT;
ALTER TABLE file_uploads ADD COLUMN file_hash VARCHAR(64);
ALTER TABLE file_uploads ADD COLUMN metadata JSONB;

-- File processing jobs
CREATE TABLE processing_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    file_upload_id INTEGER REFERENCES file_uploads(id),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Configuration Management
```sql
-- User-specific configurations
CREATE TABLE user_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    config_data JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexing Strategy
```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_dinsight_data_file_upload_id ON dinsight_data(file_upload_id);
CREATE INDEX idx_monitor_data_dinsight_data_id ON monitor_data(dinsight_data_id);
```

## API Design

### Authentication Endpoints
```yaml
# Authentication API
/api/v1/auth:
  POST /register:
    summary: User registration
    requestBody:
      email: string
      password: string
      firstName: string
      lastName: string
    responses:
      201: User created successfully
      400: Validation errors
      409: User already exists

  POST /login:
    summary: User login
    requestBody:
      email: string
      password: string
    responses:
      200: Login successful with tokens
      401: Invalid credentials
      429: Rate limit exceeded

  POST /refresh:
    summary: Refresh access token
    requestBody:
      refreshToken: string
    responses:
      200: New access token
      401: Invalid refresh token

  POST /logout:
    summary: Logout user
    headers:
      Authorization: Bearer token
    responses:
      200: Logout successful
```

### Enhanced Data Processing Endpoints
```yaml
# Data Processing API
/api/v1/data:
  POST /upload:
    summary: Upload CSV files with enhanced metadata
    requestBody:
      files: multipart/form-data
      projectName: string
      description: string
    responses:
      202: Upload accepted, processing started
      400: Invalid file format
      413: File too large

  GET /files:
    summary: List user's uploaded files
    parameters:
      page: integer
      limit: integer
      projectName: string
    responses:
      200: List of files with metadata

  DELETE /files/{id}:
    summary: Delete uploaded file
    responses:
      204: File deleted successfully
      404: File not found
```

### Job Processing Endpoints
```yaml
# Job Processing API
/api/v1/jobs:
  GET /:
    summary: List user's processing jobs
    parameters:
      status: string
      jobType: string
    responses:
      200: List of jobs

  GET /{id}:
    summary: Get job details
    responses:
      200: Job details with progress
      404: Job not found

  POST /{id}/cancel:
    summary: Cancel running job
    responses:
      200: Job cancelled
      400: Job cannot be cancelled
```

### Health and Monitoring Endpoints
```yaml
# System Health API
/api/v1/health:
  GET /:
    summary: Basic health check
    responses:
      200: Service healthy

  GET /detailed:
    summary: Detailed health check
    responses:
      200: Detailed system status
    requires: admin role

/api/v1/metrics:
  GET /:
    summary: System metrics
    responses:
      200: Performance metrics
    requires: admin role
```

## Security Architecture

### Authentication & Authorization
- **JWT-based authentication** with access and refresh tokens
- **Role-based access control** (RBAC) with roles: admin, analyst, viewer
- **Multi-factor authentication** support (TOTP)
- **Password policies** with complexity requirements
- **Account lockout** after failed attempts

### Data Protection
- **Input validation** on all endpoints using struct tags
- **SQL injection prevention** through GORM parameterized queries
- **XSS protection** through proper encoding
- **CSRF protection** using SameSite cookies
- **Rate limiting** on authentication endpoints

### Infrastructure Security
- **HTTPS-only** communication
- **Security headers** (HSTS, CSP, X-Frame-Options)
- **CORS configuration** with specific origins
- **Environment variable protection** for secrets
- **Regular dependency scanning** in CI/CD

## Performance Considerations

### Backend Optimizations
- **Database connection pooling** with configurable limits
- **Query optimization** with proper indexing
- **Caching layer** for frequently accessed data
- **Async processing** for heavy computations
- **Resource limits** for file uploads and processing

### Frontend Optimizations
- **Code splitting** by route and component
- **Image optimization** with Next.js Image component
- **Lazy loading** for non-critical components
- **Bundle analysis** and optimization
- **CDN utilization** for static assets

### Monitoring & Observability
- **Application metrics** collection
- **Error tracking** with structured logging
- **Performance monitoring** with request tracing
- **Health checks** for dependencies
- **Alerting** for critical issues

## Testing Strategy

### Backend Testing
```go
// Unit tests for business logic
func TestUserService_CreateUser(t *testing.T) {
    // Test user creation with mocked dependencies
}

// Integration tests for API endpoints
func TestAuthHandler_Login(t *testing.T) {
    // Test login endpoint with test database
}

// Performance tests for heavy operations
func BenchmarkDataProcessor_ProcessCSV(b *testing.B) {
    // Benchmark CSV processing performance
}
```

### Frontend Testing
```typescript
// Component unit tests
describe('LoginForm', () => {
  it('should validate email format', () => {
    // Test form validation
  });
});

// Integration tests
describe('Dashboard Page', () => {
  it('should load user data on mount', () => {
    // Test data loading integration
  });
});

// E2E tests with Playwright
test('user can complete full workflow', async ({ page }) => {
  // Test complete user journey
});
```

## External Dependencies

- **PostgreSQL Driver** - Database connectivity
  - **Justification**: Mature, reliable driver with excellent performance
- **Gin Web Framework** - HTTP server framework
  - **Justification**: High performance, minimal overhead, extensive middleware support
- **GORM** - ORM for database operations
  - **Justification**: Type-safe, feature-rich, active community support
- **JWT-Go** - JWT token handling
  - **Justification**: Standard implementation, security-focused, well-maintained
- **Testify** - Testing framework
  - **Justification**: Comprehensive assertion library, mocking support
- **Next.js** - React framework
  - **Justification**: Industry standard, excellent performance, strong ecosystem
- **Tailwind CSS** - Utility-first CSS framework
  - **Justification**: Rapid development, consistent design system, excellent performance
- **shadcn/ui** - Component library
  - **Justification**: Accessible, customizable, well-designed components

## Deployment Architecture

### Development Environment
```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: dinsight_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
  
  backend:
    build: ./Dinsight_API
    ports:
      - "8080:8080"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/dinsight_dev
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
```

### Production Deployment
- **Frontend**: Deployed to Vercel with automatic deployments from main branch
- **Backend**: Containerized deployment to cloud platform (AWS ECS, GCP Cloud Run, or Azure Container Instances)
- **Database**: Managed PostgreSQL service with automated backups
- **Monitoring**: Application and infrastructure monitoring setup
- **CI/CD**: GitHub Actions for automated testing and deployment

---

*This technical specification provides the detailed implementation guidance for the Dinsight platform rebuild project.*
