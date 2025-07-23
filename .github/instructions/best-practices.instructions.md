---
applyTo: '**'
---

## Context

This document defines **default development guidelines** applicable to *all* product codebases under our organization's umbrella. Individual projects may extend or override these standards in their local `.agent-os/product/dev-best-practices.md` file.

Our aim is to enforce **clarity**, **scalability**, **security**, and **maintainability** consistently across diverse applications, whether backend APIs, frontends, or data pipelines.

---

## Core Principles

### 🧠 Keep It Simple

* Implement solutions with minimal complexity necessary.
* Avoid premature optimization and over-engineering.
* Favor clarity and maintainability over cleverness.
* Follow the YAGNI principle (You Aren't Gonna Need It) to prevent feature bloat.

### 📖 Optimize for Readability

* Write self-explanatory code with meaningful naming.
* Break complex logic into small, testable functions (aim for <20 lines per function).
* Comment on *why* something is done, not *what* it does.
* Use consistent formatting and style guides across the codebase.

### 🧬 DRY (Don't Repeat Yourself)

* Extract reusable logic into functions, classes, or components.
* Share utilities and validation schemas organization-wide when appropriate.
* Avoid duplication across services and layers.
* Follow the Single Responsibility Principle (SRP) for better modularity.

### 🔄 Embrace Automation

* Automate repetitive tasks to reduce human error and increase efficiency.
* Implement automated testing, builds, and deployments.
* Use linting tools and static code analysis in development workflows.

---

## Dependencies

### ✅ Choose Libraries Wisely

* Select widely adopted, actively maintained, and well-documented libraries.
* Confirm recent activity (commits/issues < 6 months), community usage, and license compatibility.
* Use latest stable versions unless specific constraints exist.
* Regularly audit and update dependencies to address security vulnerabilities.

### ⛔ Avoid:

* Abandoned or unmaintained packages.
* Heavy dependencies that add unnecessary bloat.
* Libraries that hide critical business logic or create tight coupling.
* Dependencies with known security vulnerabilities or poor security track records.

### 🔍 Dependency Management Best Practices

* Use dependency scanning tools (e.g., Snyk, OWASP Dependency Check) in CI/CD pipelines.
* Maintain a Software Bill of Materials (SBOM) for transparency.
* Implement automated dependency updates with proper testing.

---

## Code Organization

### 🗂️ File Structure

* Organize code by **feature/domain** rather than by technical layer.
* Keep files single-responsibility and cohesive.
* Use consistent naming conventions and folder hierarchies across projects.
* Follow atomic design principles for component organization.

### 💡 Naming Conventions

* **camelCase** for variables and functions.
* **PascalCase** for types, classes, and components.
* **UPPER_SNAKE_CASE** for constants and environment variables.
* Use meaningful prefixes for async actions (e.g., `fetchUserData`, `handleSubmit`).
* Avoid abbreviations and cryptic names that require context to understand.

### 🏗️ Architecture Patterns

* Follow established design patterns (Factory, Observer, Singleton) where appropriate.
* Implement clean architecture principles with clear separation of concerns.
* Use dependency injection for better testability and flexibility.

---

## Security Best Practices

### 🔒 Security-First Development

* **Shift-Left Security**: Integrate security considerations from the earliest development phases.
* Follow the **Secure by Design** principle - build security into every component by default.
* Implement the principle of least privilege for all system access.
* Use secure defaults (strong passwords, automatic updates, MFA where applicable).

### 🛡️ Security & Authentication

* Enforce strict authentication and role-based authorization (RBAC).
* Implement multi-factor authentication (MFA) as a standard feature.
* Sanitize and validate all inputs at entry points to prevent injection attacks.
* Use secure token handling with proper expiration, refresh, and rotation.
* Store secrets in dedicated secret managers, never in source control.

### 🔍 Security Testing & Monitoring

* Implement Static Application Security Testing (SAST) in CI/CD pipelines.
* Use Dynamic Application Security Testing (DAST) for runtime vulnerability detection.
* Conduct regular penetration testing and security audits.
* Follow OWASP Top 10 guidelines for web application security.
* Implement security monitoring and incident response procedures.

### 📊 Threat Modeling

* Conduct threat modeling sessions during design phases.
* Document potential attack vectors and mitigation strategies.
* Regularly update threat models as applications evolve.

---

## API & Backend Practices

### 🔁 Async & Job Processing

* Offload long-running tasks to background workers or queues.
* Track job status and errors for observability.
* Design APIs to support polling or event-driven updates.
* Implement proper timeout and retry mechanisms.

### 🧪 Error Handling

* Use consistent structured error formats (JSON API, RFC 7807).
* Differentiate between client (4xx) and server (5xx) errors.
* Log detailed error context for debugging and auditing.
* Implement circuit breaker patterns for external service calls.
* Never expose sensitive information in error messages.

### 📡 API Design

* Follow RESTful principles and HTTP status codes consistently.
* Implement API versioning strategy from the beginning.
* Use OpenAPI/Swagger specifications for documentation.
* Implement proper rate limiting and throttling.
* Design APIs with backwards compatibility in mind.

---

## Frontend Practices

### ⚙️ Framework & Architecture

* Use modern, stable frameworks (e.g., Next.js latest stable version, React 18+).
* Favor server-side rendering (SSR) or hybrid approaches for performance and SEO.
* Leverage typed schemas (e.g., Zod, TypeScript) for validation and API contracts.
* Implement Progressive Web App (PWA) features where appropriate.

### 🧼 State Management

* Minimize global state; prefer localized component state.
* Use Context, Redux Toolkit, Zustand, or Recoil where justified.
* Keep state logic clean and separate from UI components.
* Implement proper state normalization for complex data structures.

### ♻️ Component Design

* Follow atomic design principles (atoms, molecules, organisms).
* Build reusable, composable components with clear interfaces.
* Isolate side effects into custom hooks or services.
* Implement proper error boundaries for graceful error handling.
* Use lazy loading and code splitting for better performance.

### 🎨 User Experience

* Prioritize accessibility (WCAG 2.1 AA compliance).
* Implement responsive design for multiple screen sizes.
* Optimize Core Web Vitals (LCP, FID, CLS).
* Use semantic HTML and proper ARIA labels.

---

## Testing

### ✅ Test Coverage & Strategy

* Follow the testing pyramid: Unit tests (70%) > Integration tests (20%) > E2E tests (10%).
* Write unit, integration, and E2E tests covering core functionality.
* Cover edge cases, error states, and performance-critical paths.
* Aim for 80%+ code coverage, but focus on meaningful test coverage over percentage.
* Implement mutation testing to verify test quality.

### 🔬 Test Types & Tools

* **Unit Testing**: Test individual components and functions in isolation.
* **Integration Testing**: Test interactions between different modules/services.
* **Contract Testing**: Ensure API contracts between services remain consistent.
* **Performance Testing**: Load and stress testing for critical paths.
* **Security Testing**: Automated security scans and penetration testing.

### 🤖 Test Automation

* Integrate automated testing into CI/CD pipelines.
* Use Test-Driven Development (TDD) or Behavior-Driven Development (BDD) where appropriate.
* Implement parallel test execution to reduce pipeline times.
* Maintain test environments that mirror production.

---

## Git & Development Workflow

### 📌 Git Practices

* Follow conventional commit message guidelines (e.g., Conventional Commits).
* Write clear, descriptive PR titles and descriptions.
* Use feature branches and protect main branches with required reviews.
* Implement signed commits for security verification.
* Keep commits atomic and focused on single changes.

### 🚦 Branching Model

* Maintain stable main/master branch that's always deployable.
* Use short-lived feature branches (< 1 week lifespan).
* Implement GitFlow or GitHub Flow based on team needs.
* Use meaningful branch names that reflect the work being done.

### 👥 Code Reviews

* Require at least one approval before merging to main branches.
* Review for security, performance, and maintainability, not just functionality.
* Use automated tools to catch style and basic issues before human review.
* Provide constructive feedback and knowledge sharing opportunities.

---

## CI/CD & DevOps

### 🔄 Continuous Integration

* Trigger builds on every commit to shared branches.
* Run automated tests, linting, and security scans in pipeline.
* Fail fast - stop pipeline on first critical failure.
* Provide quick feedback to developers (< 10 minutes for basic checks).

### 🚀 Continuous Deployment

* Implement deployment automation with proper rollback mechanisms.
* Use feature flags for controlled feature rollouts.
* Implement blue-green or canary deployments for zero-downtime releases.
* Automate infrastructure provisioning and configuration.

### 📊 Observability & Monitoring

* Implement comprehensive logging, metrics, and distributed tracing.
* Use monitoring tools (Prometheus, Grafana, ELK Stack) for real-time insights.
* Set up alerting for critical system metrics and business KPIs.
* Implement health checks and service discovery mechanisms.

### 🏗️ Infrastructure as Code (IaC)

* Define infrastructure using code (Terraform, CloudFormation, Pulumi).
* Version control all infrastructure definitions.
* Implement proper testing for infrastructure changes.
* Use GitOps principles for infrastructure management.

---

## Environment & Configuration

### 📁 Secrets & Environment Management

* Never commit secrets or environment variables to source control.
* Use dedicated secret management systems (AWS Secrets Manager, HashiCorp Vault).
* Implement proper secret rotation and access controls.
* Maintain environment parity between development, staging, and production.
* Use environment-specific configuration files with inheritance.

### 🐳 Containerization

* Use Docker for consistent development and deployment environments.
* Implement multi-stage builds for optimized container images.
* Follow container security best practices (non-root users, minimal base images).
* Use container orchestration (Kubernetes) for production workloads.

---

## Performance & Scalability

### ⚡ Performance Optimization

* Profile applications regularly to identify bottlenecks.
* Implement caching strategies at appropriate layers (browser, CDN, application, database).
* Optimize database queries and implement proper indexing.
* Use lazy loading and pagination for large datasets.
* Implement connection pooling and resource management.

### 📈 Scalability Patterns

* Design for horizontal scaling from the beginning.
* Implement microservices architecture where appropriate.
* Use event-driven architecture for loose coupling.
* Implement proper load balancing and auto-scaling mechanisms.

---

## AI & Modern Development Tools

### 🤖 AI-Assisted Development

* Leverage AI tools (GitHub Copilot, Tabnine) for code completion and suggestions.
* Use AI for code review automation and security vulnerability detection.
* Implement AI-powered testing tools for test case generation and optimization.
* Balance AI assistance with human oversight and code understanding.

### 🔍 Code Quality Tools

* Use static code analysis tools (SonarQube, CodeClimate) in CI/CD pipelines.
* Implement automated code formatting (Prettier, Black, gofmt).
* Use linting tools specific to your technology stack.
* Implement pre-commit hooks for early issue detection.

---

## Documentation & Communication

### 📚 Maintain Updated Documentation

* Keep design, requirements, and task docs in sync with code.
* Document architectural decisions and trade-offs (ADRs).
* Maintain runbooks for operational procedures.
* Update task tracking files after implementation steps.
* Use documentation-as-code approaches for better maintainability.

### 📖 Code Documentation

* Write self-documenting code with clear naming and structure.
* Document complex algorithms and business logic.
* Maintain API documentation with examples and usage patterns.
* Include README files with setup and development instructions.

### 🔍 Team Collaboration

* Encourage knowledge sharing through tech talks and documentation.
* Implement pair programming and mob programming sessions.
* Use collaborative tools for design and architecture discussions.
* Foster a blameless culture focused on continuous improvement.

---

## Compliance & Standards

### 📋 Industry Standards

* Follow relevant industry standards (ISO 27001, SOC 2, HIPAA, GDPR).
* Implement data protection and privacy by design.
* Maintain audit trails for compliance requirements.
* Regular compliance assessments and gap analysis.

### 🏆 Quality Metrics

* Track and monitor key development metrics (lead time, deployment frequency, MTTR).
* Measure code quality metrics (cyclomatic complexity, technical debt).
* Monitor security metrics (vulnerability count, time to fix).
* Regular retrospectives and process improvement initiatives.

---

## Emerging Trends for 2025

### 🌟 Cloud-Native Development

* Design applications specifically for cloud environments.
* Implement serverless architectures where appropriate.
* Use managed services to reduce operational overhead.
* Implement proper cloud cost optimization strategies.

### 🔗 API-First Development

* Design APIs before implementing functionality.
* Use API mocking for parallel development.
* Implement comprehensive API testing strategies.
* Focus on developer experience (DX) for API consumers.

### 🚀 Platform Engineering

* Build internal developer platforms to improve productivity.
* Standardize development toolchains and workflows.
* Implement self-service capabilities for developers.
* Focus on developer experience and productivity metrics.

---