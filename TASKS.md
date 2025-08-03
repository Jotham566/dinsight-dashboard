# 📋 DInsight Dashboard - Master Task List

> **Project**: Predictive Maintenance Platform Refactor
> **Status**: In Progress
> **Last Updated**: 2025-08-03

## 🎯 Project Goals
- Migrate from Streamlit to production-ready architecture
- Implement missing authentication & user management
- Add multi-machine/organization support
- Enhance anomaly detection with Mahalanobis Distance
- Build modern Next.js frontend with TypeScript

## 📊 Task Categories

### 🔵 Phase 1: Specifications & Planning
- [x] Review existing API structure
- [ ] Create comprehensive specification documents
  - [ ] API Specification (specs/api/README.md)
  - [ ] Frontend Specification (specs/frontend/README.md)
  - [ ] Database Schema Specification (specs/database/README.md)
  - [ ] Authentication & Authorization Spec (specs/auth/README.md)
- [ ] Document feature gaps from Streamlit dashboard
- [ ] Define API endpoint requirements for missing features

### 🟢 Phase 2: Backend Enhancements
#### Authentication & User Management
- [x] Design JWT-based authentication system
- [x] Implement user registration endpoint
- [x] Implement login endpoint
- [x] Add refresh token mechanism
- [x] Design and implement database schema for users, organizations, etc.
- [x] Create default admin user and organization
- [x] Add JWT middleware for route protection
- [x] Test authentication system with real requests
- [ ] Add password reset functionality
- [ ] Create user profile management endpoints

#### Organization & Machine Management
- [x] Design organization data model
- [x] Design machine/equipment data model  
- [x] Design user-organization relationships
- [ ] Create organization CRUD endpoints
- [ ] Create machine CRUD endpoints
- [ ] Implement organization-machine relationships
- [ ] Add user-organization permissions

#### Enhanced Analytics
- [ ] Implement Mahalanobis Distance calculation
- [ ] Add configurable anomaly thresholds
- [ ] Create anomaly detection endpoints
- [ ] Add sensitivity control parameters
- [ ] Implement real-time alert system
- [ ] Add classification results storage

#### Data Management Improvements
- [ ] Add dataset metadata tracking
- [ ] Implement data lineage features
- [ ] Add data validation endpoints
- [ ] Create dataset compatibility checking
- [ ] Add example dataset loading

### 🟣 Phase 3: Frontend Development (Next.js + TypeScript)
#### Core Setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Tailwind CSS
- [ ] Configure ESLint and Prettier
- [ ] Set up API client (Axios/Fetch)
- [ ] Implement authentication context

#### UI Components
- [ ] Create responsive layout shell
- [ ] Build authentication pages (login/register)
- [ ] Create dashboard navigation
- [ ] Implement file upload component
- [ ] Build configuration panel
- [ ] Create data table components

#### Visualization Features
- [ ] Integrate Plotly.js for charts
- [ ] Build scatter plot component
- [ ] Add distribution charts
- [ ] Implement anomaly overlay visualization
- [ ] Create side-by-side comparison views
- [ ] Add zoom/pan/export functionality

#### Dashboard Pages
- [ ] Data Summary page
- [ ] Visualization page
- [ ] Advanced Analysis page
- [ ] Feature Analysis page
- [ ] Organization Management page
- [ ] Machine Management page
- [ ] User Settings page

### 🟡 Phase 4: Integration & Testing
- [ ] API integration tests
- [ ] Frontend unit tests
- [ ] End-to-end testing setup
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing

### 🔴 Phase 5: Deployment & Documentation
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User documentation
- [ ] Deployment guides
- [ ] Environment configuration

## 📝 Notes

### Current Backend Status
- ✅ File upload and processing
- ✅ Configuration management
- ✅ Basic data retrieval
- ✅ Basic monitoring features
- ❌ Authentication system
- ❌ User management
- ❌ Organization/machine management
- ❌ Advanced anomaly detection
- ❌ Alert system

### Technology Stack
- **Backend**: Go + Gin framework
- **Database**: PostgreSQL
- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Plotly.js
- **State Management**: TBD (Context API or Zustand)

### Priority Features from Streamlit
1. Multi-file CSV upload with validation
2. Dimensionality reduction visualization
3. Mahalanobis Distance anomaly detection
4. Feature value visualization
5. Real-time monitoring alerts

---

## 🚀 Getting Started
1. Review all specification documents in `/specs`
2. Start with Phase 2 backend enhancements
3. Update this file after completing each task
4. Mark tasks with [x] when complete