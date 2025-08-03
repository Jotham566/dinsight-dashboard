# 📚 DInsight Platform Specifications

> **Version**: 1.0.0  
> **Created**: 2025-08-03  
> **Purpose**: Comprehensive technical specifications for the DInsight predictive maintenance platform

## 📂 Specification Documents

### [API Specification](./api/README.md)
Complete REST API documentation including:
- Current endpoints (file upload, analysis, monitoring)
- Planned endpoints (auth, organizations, machines, alerts)
- Request/response formats
- Error handling standards
- Websocket endpoints for real-time features

### [Frontend Specification](./frontend/README.md)
Modern Next.js application blueprint:
- Technology stack (Next.js 14+, TypeScript, Tailwind)
- Page layouts and user flows
- Component architecture
- State management approach
- Performance and accessibility requirements

### [Database Schema](./database/README.md)
PostgreSQL database design:
- Current schema (file uploads, configs, monitoring data)
- New schema (users, organizations, machines, anomalies)
- Relationships and constraints
- Performance optimization strategies
- Migration approach

### [Authentication & Authorization](./auth/README.md)
Security implementation guide:
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenancy support
- Security best practices
- OAuth integration plans

## 🎯 Quick Start

1. **Review the master task list**: Check [TASKS.md](../TASKS.md) for the implementation roadmap
2. **Understand current state**: The API already has basic file processing capabilities
3. **Focus areas**: Authentication, multi-tenant support, and advanced analytics are the main gaps
4. **Technology decisions**: Backend uses Go + Gin, Frontend will use Next.js + TypeScript

## 🔄 Development Workflow

1. Pick a task from TASKS.md
2. Review relevant specifications
3. Implement following the specs
4. Update TASKS.md with progress
5. Create PR with clear description

## 📊 Current vs Target State

### ✅ What's Already Built
- File upload and CSV processing
- Basic dimensionality reduction (DInsight)
- Configuration management
- Simple monitoring capabilities
- PostgreSQL data storage

### 🚧 What Needs Building
- **Authentication System**: Complete JWT-based auth
- **User Management**: Registration, profiles, organizations
- **Multi-tenancy**: Organization and machine management
- **Advanced Analytics**: Mahalanobis Distance anomaly detection
- **Alerting System**: Rules, notifications, acknowledgments
- **Modern Frontend**: Replace Streamlit with Next.js
- **Real-time Features**: Websockets for live monitoring

## 🛠️ Implementation Priorities

### Phase 1: Backend Foundation
Focus on authentication and data models to support multi-tenant operations.

### Phase 2: Core Features
Implement organization/machine management and enhance analytics.

### Phase 3: Frontend Development
Build the Next.js application following the frontend specification.

### Phase 4: Advanced Features
Add real-time monitoring, advanced visualizations, and reporting.

## 📝 Notes for Developers

- **Maintain backwards compatibility** with existing endpoints
- **Follow security best practices** outlined in auth spec
- **Use consistent error handling** as defined in API spec
- **Optimize for performance** using indexes and caching
- **Write tests** for all new functionality
- **Document as you go** - update specs if requirements change