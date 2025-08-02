# Deployment Specification

This is the deployment specification for the spec detailed in @.agent-os/specs/2025-08-01-dinsight-platform-rebuild/spec.md

> Created: 2025-08-01  
> Version: 1.0.0

## Deployment Overview

This specification outlines the deployment strategy, infrastructure, and DevOps practices for the Dinsight platform rebuild, ensuring scalable, secure, and reliable production deployments.

### Deployment Philosophy
- **Infrastructure as Code**: All infrastructure defined and versioned in code
- **GitOps**: Deployment driven by Git workflows and automated pipelines
- **Zero-Downtime**: Blue-green and rolling deployments for high availability
- **Security First**: Security scanning, secrets management, and compliance built-in
- **Observability**: Comprehensive monitoring, logging, and alerting

### Technology Stack
- **Container Platform**: Docker containers with multi-stage builds
- **Orchestration**: Kubernetes for production scaling
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Frontend Hosting**: Vercel with edge deployment
- **Backend Hosting**: Cloud-native platforms (Azure/AWS/GCP)
- **Database**: Managed PostgreSQL with automated backups
- **Monitoring**: Datadog/New Relic with custom dashboards

## Infrastructure Architecture

### Production Environment Architecture
```
                                    ┌─────────────────┐
                                    │   Cloudflare    │
                                    │      CDN        │
                                    └─────────┬───────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
            ┌───────▼─────────┐      ┌──────▼──────┐         ┌─────────▼─────────┐
            │    Frontend     │      │   API Load  │         │    Admin Panel    │
            │    (Vercel)     │      │  Balancer   │         │    (Vercel)       │
            └─────────────────┘      └──────┬──────┘         └───────────────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          │                 │                 │
                  ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
                  │  API Instance  │ │  API Instance  │ │  API Instance  │
                  │      #1        │ │      #2        │ │      #3        │
                  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                          │                 │                 │
                          └─────────────────┼─────────────────┘
                                            │
                                   ┌────────▼────────┐
                                   │   PostgreSQL    │
                                   │    Cluster      │
                                   │  (Primary +     │
                                   │   Read Replica) │
                                   └─────────────────┘
```

### Infrastructure Components

#### Frontend Infrastructure
- **Platform**: Vercel with global edge deployment
- **Domains**: Custom domain with SSL/TLS certificates
- **CDN**: Built-in edge caching and global distribution
- **Environment Isolation**: Production, staging, and preview environments
- **Performance**: Automatic image optimization and static asset caching

#### Backend Infrastructure
- **Container Registry**: Docker images stored in cloud registry
- **Compute**: Kubernetes cluster with auto-scaling
- **Load Balancing**: Application load balancer with health checks
- **Service Mesh**: Istio for traffic management and security
- **Horizontal Pod Autoscaler**: Scale based on CPU/memory/custom metrics

#### Database Infrastructure
- **Primary Database**: Managed PostgreSQL with high availability
- **Read Replicas**: For improved read performance
- **Backup Strategy**: Automated daily backups with point-in-time recovery
- **Connection Pooling**: PgBouncer for efficient connection management
- **Security**: Encryption at rest and in transit

#### Storage Infrastructure
- **File Storage**: Cloud object storage (S3/Azure Blob/GCS)
- **Processing**: Temporary storage for data processing workflows
- **CDN Integration**: Static assets served via CDN
- **Backup**: Cross-region replication for disaster recovery

## Deployment Environments

### Environment Strategy
```
Development (Local) → Feature Branch (Preview) → Staging → Production
```

### Environment Configurations

### Development Environment
```yaml
# Recommended: Fully Native Development Setup
components:
  database:
    type: "Native PostgreSQL 15+"
    purpose: "Maximum performance and debugging access"
    connection: "localhost:5432"
  
  backend:
    type: "Native Go Binary"
    purpose: "Fast development with hot reload"
    connection: "localhost:8080"
    
  frontend:
    type: "Native Next.js Dev Server"
    purpose: "Instant hot reload and debugging"
    connection: "localhost:3000"

# Alternative: Docker for CI/CD Testing Only
# Use only for testing deployment scenarios or CI pipeline validation
```

**Rationale for Fully Native Approach**:
- ✅ **Maximum Simplicity**: No Docker installation or management required
- ✅ **Development Speed**: All processes start instantly with native performance
- ✅ **Resource Efficiency**: Zero container overhead
- ✅ **Debug Friendly**: Direct access to all processes and tools
- ✅ **Production Parity**: Same PostgreSQL features through version consistency
- ✅ **Team Consistency**: Enforced through environment validation scripts
# docker-compose.yml for CI/CD Testing Only
version: '3.8'
services:
  # PostgreSQL for integration testing
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dinsight_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    tmpfs:
      - /var/lib/postgresql/data

  # Redis for testing (if needed)
  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    tmpfs:
      - /data

# Note: For local development, use native PostgreSQL installation
# See README-Local-Setup.md for native setup instructions
```

#### Staging Environment
```yaml
# k8s/staging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dinsight-staging
  labels:
    environment: staging

---
# k8s/staging/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: dinsight-staging
data:
  DATABASE_URL: "postgresql://staging_user:password@postgres-staging:5432/dinsight_staging"
  LOG_LEVEL: "info"
  ENVIRONMENT: "staging"

---
# k8s/staging/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: dinsight-staging
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  DATABASE_PASSWORD: <base64-encoded-password>

---
# k8s/staging/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dinsight-api
  namespace: dinsight-staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dinsight-api
  template:
    metadata:
      labels:
        app: dinsight-api
    spec:
      containers:
      - name: api
        image: dinsight/api:staging-latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

#### Production Environment
```yaml
# k8s/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dinsight-api
  namespace: dinsight-production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: dinsight-api
  template:
    metadata:
      labels:
        app: dinsight-api
        version: v1
    spec:
      serviceAccountName: dinsight-api
      containers:
      - name: api
        image: dinsight/api:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true

---
# k8s/production/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dinsight-api-service
  namespace: dinsight-production
spec:
  selector:
    app: dinsight-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP

---
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dinsight-api-hpa
  namespace: dinsight-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dinsight-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Container Strategy

### Multi-Stage Docker Builds

#### Backend Dockerfile
```dockerfile
# Dinsight_API/Dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Production stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Create non-root user
RUN adduser -D -s /bin/sh appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Command to run
CMD ["./main"]
```

#### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
# Dependencies stage
FROM node:20-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Builder stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### Development Dockerfile
```dockerfile
# Dinsight_API/Dockerfile.dev
FROM golang:1.21-alpine

WORKDIR /app

# Install air for hot reloading
RUN go install github.com/cosmtrek/air@latest

# Copy go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Use air for hot reloading
CMD ["air"]
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Run backend tests
      run: |
        cd Dinsight_API
        go test -v ./... -coverprofile=coverage.out
    
    - name: Run frontend tests
      run: |
        cd frontend
        npm ci
        npm run test -- --coverage --watchAll=false
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./Dinsight_API/coverage.out

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  build-and-push:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Extract metadata for backend
      id: meta-backend
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: ./Dinsight_API
        push: true
        tags: ${{ steps.meta-backend.outputs.tags }}
        labels: ${{ steps.meta-backend.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBECONFIG_STAGING }}
    
    - name: Deploy to staging
      run: |
        sed -i 's|IMAGE_TAG|${{ github.sha }}|g' k8s/staging/*.yaml
        kubectl apply -f k8s/staging/
    
    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/dinsight-api -n dinsight-staging --timeout=300s

  deploy-production:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBECONFIG_PRODUCTION }}
    
    - name: Deploy to production
      run: |
        sed -i 's|IMAGE_TAG|${{ github.sha }}|g' k8s/production/*.yaml
        kubectl apply -f k8s/production/
    
    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/dinsight-api -n dinsight-production --timeout=600s
    
    - name: Run smoke tests
      run: |
        kubectl run smoke-test --image=curlimages/curl --rm -i --restart=Never -- \
          curl -f http://dinsight-api-service.dinsight-production.svc.cluster.local/health

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: ./frontend
        vercel-args: '--prod'
```

### GitOps with ArgoCD
```yaml
# .argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dinsight-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/dinsight-dashboard
    targetRevision: HEAD
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: dinsight-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
  revisionHistoryLimit: 10
```

## Database Deployment

### Migration Strategy
```go
// internal/database/migrations.go
type Migration struct {
    Version     int
    Description string
    Up          func(*gorm.DB) error
    Down        func(*gorm.DB) error
}

var migrations = []Migration{
    {
        Version:     1,
        Description: "Create users table",
        Up: func(db *gorm.DB) error {
            return db.AutoMigrate(&model.User{})
        },
        Down: func(db *gorm.DB) error {
            return db.Migrator().DropTable(&model.User{})
        },
    },
    {
        Version:     2,
        Description: "Create file_uploads table",
        Up: func(db *gorm.DB) error {
            return db.AutoMigrate(&model.FileUpload{})
        },
        Down: func(db *gorm.DB) error {
            return db.Migrator().DropTable(&model.FileUpload{})
        },
    },
    // Add more migrations as needed
}

func RunMigrations(db *gorm.DB) error {
    // Create migrations table
    if err := db.AutoMigrate(&MigrationRecord{}); err != nil {
        return err
    }
    
    for _, migration := range migrations {
        var record MigrationRecord
        result := db.Where("version = ?", migration.Version).First(&record)
        
        if result.Error == gorm.ErrRecordNotFound {
            // Run migration
            if err := migration.Up(db); err != nil {
                return fmt.Errorf("migration %d failed: %w", migration.Version, err)
            }
            
            // Record migration
            record = MigrationRecord{
                Version:     migration.Version,
                Description: migration.Description,
                AppliedAt:   time.Now(),
            }
            
            if err := db.Create(&record).Error; err != nil {
                return fmt.Errorf("failed to record migration %d: %w", migration.Version, err)
            }
            
            log.Printf("Applied migration %d: %s", migration.Version, migration.Description)
        }
    }
    
    return nil
}

type MigrationRecord struct {
    ID          uint      `gorm:"primaryKey"`
    Version     int       `gorm:"uniqueIndex"`
    Description string
    AppliedAt   time.Time
}
```

### Database Backup Strategy
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/dinsight"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/dinsight_backup_$TIMESTAMP.sql.gz"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/dinsight_backup_$TIMESTAMP.sql.gz" \
    "s3://dinsight-backups/database/dinsight_backup_$TIMESTAMP.sql.gz"

# Clean up old backups locally
find $BACKUP_DIR -name "dinsight_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Clean up old backups in S3
aws s3 ls s3://dinsight-backups/database/ --recursive \
    | awk '$1 <= "'$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')'" {print $4}' \
    | xargs -I {} aws s3 rm s3://dinsight-backups/{}

echo "Backup completed successfully"
```

### Database Initialization Script
```sql
-- scripts/init-production-db.sql
-- Create database and user for production
CREATE DATABASE dinsight_production;
CREATE USER dinsight_prod WITH ENCRYPTED PASSWORD 'secure_production_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE dinsight_production TO dinsight_prod;

-- Connect to the database
\c dinsight_production;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set timezone
SET timezone = 'UTC';

-- Configure connection limits
ALTER USER dinsight_prod CONNECTION LIMIT 50;
```

## Monitoring and Observability

### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'dinsight-api'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)
    - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      regex: ([^:]+)(?::\d+)?;(\d+)
      replacement: $1:$2
      target_label: __address__

  - job_name: 'postgres-exporter'
    static_configs:
    - targets: ['postgres-exporter:9187']

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093
```

### Grafana Dashboards
```json
{
  "dashboard": {
    "title": "Dinsight Platform Metrics",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active Connections"
          }
        ]
      }
    ]
  }
}
```

### Health Check Implementation
```go
// internal/handler/health.go
type HealthHandler struct {
    db     *gorm.DB
    config *config.Config
}

type HealthResponse struct {
    Status   string            `json:"status"`
    Version  string            `json:"version"`
    Checks   map[string]string `json:"checks"`
    Uptime   time.Duration     `json:"uptime"`
}

func (h *HealthHandler) Health(c *gin.Context) {
    checks := make(map[string]string)
    overall := "healthy"
    
    // Database check
    sqlDB, err := h.db.DB()
    if err != nil {
        checks["database"] = "unhealthy: " + err.Error()
        overall = "unhealthy"
    } else if err := sqlDB.Ping(); err != nil {
        checks["database"] = "unhealthy: " + err.Error()
        overall = "unhealthy"
    } else {
        checks["database"] = "healthy"
    }
    
    // Memory check
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    if m.Alloc > 1<<30 { // 1GB
        checks["memory"] = "warning: high memory usage"
        if overall == "healthy" {
            overall = "warning"
        }
    } else {
        checks["memory"] = "healthy"
    }
    
    response := HealthResponse{
        Status:  overall,
        Version: h.config.Version,
        Checks:  checks,
        Uptime:  time.Since(startTime),
    }
    
    statusCode := http.StatusOK
    if overall == "unhealthy" {
        statusCode = http.StatusServiceUnavailable
    }
    
    c.JSON(statusCode, response)
}

func (h *HealthHandler) Ready(c *gin.Context) {
    // Simple readiness check
    if err := h.db.Exec("SELECT 1").Error; err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "status": "not ready",
            "error":  err.Error(),
        })
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "status": "ready",
    })
}
```

## Security and Compliance

### Secret Management
```yaml
# k8s/production/sealed-secret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
  namespace: dinsight-production
spec:
  encryptedData:
    JWT_SECRET: AgBy3i4O...encrypted...
    DATABASE_PASSWORD: AgBy3i4O...encrypted...
    STRIPE_SECRET_KEY: AgBy3i4O...encrypted...
  template:
    metadata:
      name: app-secrets
      namespace: dinsight-production
    type: Opaque
```

### Network Security
```yaml
# k8s/production/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dinsight-network-policy
  namespace: dinsight-production
spec:
  podSelector:
    matchLabels:
      app: dinsight-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
  - to: []
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 443   # HTTPS
```

### Security Scanning
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  push:
    branches: [ main ]

jobs:
  container-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Run Trivy scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: 'ghcr.io/${{ github.repository }}/backend:latest'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  dependency-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
```

## Disaster Recovery

### Backup Strategy
```bash
#!/bin/bash
# scripts/disaster-recovery.sh

# Database backup and restore procedures
backup_database() {
    echo "Creating database backup..."
    pg_dump $DATABASE_URL | gzip > "backup_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    # Upload to multiple cloud providers for redundancy
    aws s3 cp backup_*.sql.gz s3://dinsight-backups-primary/
    gsutil cp backup_*.sql.gz gs://dinsight-backups-secondary/
}

restore_database() {
    local backup_file=$1
    echo "Restoring database from $backup_file..."
    
    # Download from cloud storage
    aws s3 cp s3://dinsight-backups-primary/$backup_file .
    
    # Restore database
    gunzip -c $backup_file | psql $DATABASE_URL
}

# Application data backup
backup_files() {
    echo "Backing up application files..."
    
    # Sync uploads directory to cloud storage
    aws s3 sync /app/uploads s3://dinsight-files-backup/uploads/
    
    # Backup processed data
    aws s3 sync /app/processed s3://dinsight-files-backup/processed/
}

# Full system backup
full_backup() {
    backup_database
    backup_files
    
    echo "Full backup completed at $(date)"
}

# Recovery procedures
recovery_mode() {
    echo "Entering disaster recovery mode..."
    
    # Scale down application
    kubectl scale deployment dinsight-api --replicas=0 -n dinsight-production
    
    # Restore latest backup
    latest_backup=$(aws s3 ls s3://dinsight-backups-primary/ | sort | tail -n 1 | awk '{print $4}')
    restore_database $latest_backup
    
    # Scale up application
    kubectl scale deployment dinsight-api --replicas=3 -n dinsight-production
    
    echo "Disaster recovery completed"
}
```

### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 1 hour
- **Recovery Point Objective (RPO)**: 15 minutes
- **Backup Frequency**: Every 6 hours with transaction log shipping
- **Cross-Region Replication**: Real-time for critical data

## Performance Optimization

### CDN Configuration
```yaml
# cloudflare-config.yaml
zone_name: "dinsight.com"
dns_records:
  - name: "api"
    type: "CNAME"
    content: "dinsight-api-lb.your-cloud.com"
    proxied: true
  - name: "app"
    type: "CNAME"
    content: "dinsight-frontend.vercel.app"
    proxied: true

page_rules:
  - url: "api.dinsight.com/api/v1/health"
    settings:
      cache_level: "bypass"
  - url: "api.dinsight.com/api/v1/*"
    settings:
      cache_level: "bypass"
      security_level: "high"
  - url: "app.dinsight.com/_next/static/*"
    settings:
      cache_level: "cache_everything"
      edge_cache_ttl: 2592000  # 30 days
```

### Auto-Scaling Configuration
```yaml
# k8s/production/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: dinsight-api-vpa
  namespace: dinsight-production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dinsight-api
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: "250m"
        memory: "256Mi"
      maxAllowed:
        cpu: "2000m"
        memory: "2Gi"

---
# k8s/production/cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/dinsight-cluster
```

## Cost Optimization

### Resource Optimization
```yaml
# k8s/production/resource-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dinsight-quota
  namespace: dinsight-production
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
    services: "10"
    persistentvolumeclaims: "5"

---
apiVersion: v1
kind: LimitRange
metadata:
  name: dinsight-limits
  namespace: dinsight-production
spec:
  limits:
  - default:
      cpu: 500m
      memory: 512Mi
    defaultRequest:
      cpu: 250m
      memory: 256Mi
    type: Container
```

### Cost Monitoring
```bash
#!/bin/bash
# scripts/cost-monitoring.sh

# Monitor cloud costs and send alerts
check_costs() {
    # Get current month costs
    current_costs=$(aws ce get-cost-and-usage \
        --time-period Start=2025-01-01,End=2025-02-01 \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
        --output text)
    
    # Alert if costs exceed threshold
    if (( $(echo "$current_costs > 1000" | bc -l) )); then
        # Send alert to Slack/email
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Warning: Monthly costs exceeded \$1000. Current: \$$current_costs\"}" \
            $SLACK_WEBHOOK_URL
    fi
}
```

---

*This deployment specification provides comprehensive coverage of infrastructure, CI/CD, security, monitoring, and operational procedures for the Dinsight platform rebuild, ensuring reliable and scalable production deployments.*
