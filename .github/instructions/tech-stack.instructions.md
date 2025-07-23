---
applyTo: '**'
---

## Context

These are the **default technology recommendations** for all new product codebases in our organization. They provide a solid, well-supported foundation for scalable and modern applications. Individual projects may override these in `.agent-os/product/tech-stack.md`.

---

## Core Technologies

### Application Framework (Backend)
- **Framework:** NestJS (TypeScript) or Express.js + TypeScript  
- **Language:** TypeScript (Node.js 20+)  
- **Version:** Latest stable release  

**Rationale:**  
- NestJS offers modular architecture and out-of-the-box support for enterprise features (dependency injection, validation, security).  
- TypeScript ensures type safety and maintainability.  
:contentReference[oaicite:1]{index=1}

---

## Database
- **Primary:** PostgreSQL  
- **Version:** Latest stable (14+)  
- **ORM:** Prisma or TypeORM  

**Rationale:**  
- PostgreSQL is mature, reliable, and supports advanced use cases like full-text search.  
- Prisma provides type-safe database access and developer ergonomics.  
:contentReference[oaicite:2]{index=2}

---

## Frontend Stack

### JavaScript Framework
- **Framework:** Next.js 14+ (with App Router)  
- **Language:** TypeScript  
- **Build Tool:** Turbopack  

**Rationale:**  
- Best-in-class SSR, SSG, routing, and performance optimizations.  
- Strong ecosystem and future-ready tooling.  
:contentReference[oaicite:3]{index=3}

### Import Strategy & Package Management
- **Module System:** ESM  
- **Package Manager:** npm or pnpm (workspace support)  
- **Node.js Version:** Latest LTS (20+)

---

## CSS & UI

### Utility-First CSS
- **Framework:** Tailwind CSS (v4+) with PostCSS  
- **Component Library:** shadcn/ui (built on Tailwind)

**Rationale:**  
- Tailwind enables rapid, consistent styling.  
- shadcn/ui provides accessible, themeable React components.  
:contentReference[oaicite:4]{index=4}

---

## Assets & Media

### Fonts & Icons
- **Fonts:** Self-hosted Google Fonts  
- **Icons:** Phosphor Icons or Heroicons (React components)

---

## Infrastructure & Hosting

### Application Hosting
- **Platform:** Vercel or Azure App Service (depending on project needs)  
- **Edge Functions:** Vercel Edge or Cloudflare Workers support  
:contentReference[oaicite:5]{index=5}

### Database Hosting
- **Provider:** Managed PostgreSQL (e.g., Azure, Supabase)  
- **Backups:** Automated daily

### File & Asset Storage
- **Provider:** AWS S3, Azure Blob, or GCP Cloud Storage  
- **CDN:** Cloudflare or built-in platform CDN  
- **Access:** Presigned URLs or IAM-based access control  

---

## DevOps & Deployment

### CI/CD Pipeline
- **Platform:** GitHub Actions  
- **Triggers:** commits/PRs to `main` / `staging`  
- **Steps:** install → lint → test → build → deploy

### Environments
- **main:** production  
- **staging:** integration testing  
- **feature/*:** preview environments on each PR

---

## Observability & Performance

### Monitoring & Logs
- Use **Datadog**, **New Relic**, or **Azure Monitor**  
- Application-level alerts and dashboards

### Performance Optimization
- **Modular rendering & adaptive hydration** (e.g., Next.js islands)  
:contentReference[oaicite:6]{index=6}
- Edge-first delivery for SSR/SSG pages  
:contentReference[oaicite:7]{index=7}

---

## Security & Compliance

- **Zero-trust** principles and secure-by-default mindset  
- **DAST** (Dynamic Application Security Testing) integrated into CI  
:contentReference[oaicite:8]{index=8}  
- Regular dependency audits and vulnerability scanning

---

## Summary Table

| Layer                     | Tech Choice                                  |
|---------------------------|----------------------------------------------|
| Backend Framework         | NestJS or Express.js + TypeScript            |
| Database                  | PostgreSQL + Prisma/TypeORM                  |
| Frontend Framework        | Next.js (TypeScript, Turbopack)              |
| CSS / UI                  | Tailwind CSS + shadcn/ui                    |
| Hosting                   | Vercel / Azure (with Edge support)          |
| Storage & CDN             | S3 / Blob + Cloudflare                      |
| CI/CD                     | GitHub Actions                              |
| Observability             | Datadog / New Relic                         |
| Security                  | DAST in CI + zero-trust architecture        |

---

These defaults are designed for modern, enterprise-grade applications. Feel free to customize at the project level based on specific constraints or use cases.