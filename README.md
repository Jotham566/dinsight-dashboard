# Dinsight Dashboard

> Industrial monitoring + anomaly-detection platform for CSV-based sensor data.

[![License](https://img.shields.io/badge/license-Custom-blue.svg)](#license)
[![Go](https://img.shields.io/badge/go-1.23.2-blue.svg)](https://golang.org/)
[![Node](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9+-blue.svg)](https://typescriptlang.org/)

Dinsight ingests sensor CSVs, runs a custom dimensionality-reduction pass (the "DInsight" algorithm), surfaces anomalies via Mahalanobis distance, and presents the result through an operator-first dashboard. Built for plant operators and maintenance teams who need a live read on equipment health without a data-science workflow.

## Features

- **CSV upload + processing** — baseline + monitoring datasets, async pipeline with progress polling.
- **Dimensionality reduction** — DInsight algorithm for 2D scatter visualizations of high-dimensional feature vectors.
- **Anomaly detection** — Mahalanobis distance, configurable sensitivity, persisted classifications.
- **Wear-trend analysis** — deterioration scoring against a chosen baseline cluster, time-series view.
- **Live monitor** — polls the BE for the latest monitoring points; emphasis styling on the trailing window.
- **Multi-tenancy** — organizations, teams, memberships. Records are tenant-isolated at the DB level (`organization_id NOT NULL` on every records-side table). Active org per-request via `X-Org-ID`. See [`Dinsight_API/docs/TENANCY_AND_RBAC.md`](Dinsight_API/docs/TENANCY_AND_RBAC.md).
- **RBAC** — three roles (admin / operator / viewer). BE `middleware.RequireAction` is authoritative; FE `RequirePermission` mirrors the matrix to hide affordances.
- **OIDC SSO** (optional) — plug an external IdP via four env vars. Configured: `/login` shows an SSO button. Unset: SSO endpoints 404 and password flow stays the only option.
- **Audit log** — every write to org-scoped routes is recorded (actor, action, resource, outcome, IP). Async writer. Admin-only viewer under Account & Security.
- **JWT auth** — access + refresh tokens. JWT carries the user's full membership list so per-request org resolution is one parse, not a DB round-trip.
- **License verification** — JWT-signed deployment license; device-count enforcement.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js 15)  │◄──►│   (Go + Gin)    │◄──►│  (PostgreSQL)   │
│   :3000         │    │   :8080         │    │   :5432         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Backend** — Go 1.23, Gin, GORM, PostgreSQL with JSONB for flexible payloads.
- **Frontend** — Next.js 15 (App Router), TypeScript, Tailwind, React Query, Plotly.
- **Background processing** — file uploads + DInsight runs happen in goroutines; FE polls `/analyze/:id/status`.

## Prerequisites

- Go 1.23.2+ — [download](https://golang.org/dl/)
- Node.js 20+ — [download](https://nodejs.org/)
- pnpm 10+ — `npm install -g pnpm`
- PostgreSQL 14+ — [download](https://postgresql.org/download/)

## Setup

```bash
git clone https://github.com/Jotham566/dinsight-dashboard.git
cd dinsight-dashboard

# 1. Database
createdb dinsight   # or: psql -c "CREATE DATABASE dinsight;"

# 2. Backend
cd Dinsight_API
go mod download
go build -o dist/api-server ./cmd/api
go run ./cmd/migrate up   # apply schema
./dist/api-server         # serves :8080

# 3. Frontend (separate terminal)
cd frontend
pnpm install
pnpm dev                  # serves :3000
```

The seed admin account (`admin@disum.com` / `DInsight123!`) is provisioned by migrations in dev. Set `DISABLE_SEED_ADMIN=true` for production.

### License

Place `license.lic` in `Dinsight_API/`. `devices.json` is created automatically on first device registration.

## API documentation

Swagger UI: <http://localhost:8080/swagger/index.html> (source of truth — generated from handler annotations).

Key routes:

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/auth/login` | Returns access + refresh tokens. |
| POST | `/api/v1/analyze` | Upload baseline CSV (multipart). |
| POST | `/api/v1/monitor/:dinsight_id` | Upload monitoring CSV against an existing baseline. |
| GET | `/api/v1/dinsight/:id` | Get reduced 2D coordinates. |
| GET | `/api/v1/monitor/:dinsight_id/coordinates` | Latest monitoring coordinates. |
| POST | `/api/v1/anomaly/detect` | Mahalanobis-distance scoring. |
| POST | `/api/v1/deterioration/:dinsight_id/analyze` | Wear-trend analysis. |
| GET | `/api/v1/audit` | Admin-only audit log feed. |

All non-auth routes require `Authorization: Bearer <jwt>` and the active org via `X-Org-ID` (or fall back to the user's first membership in the JWT).

## Project structure

```
.
├── Dinsight_API/              # Go backend (separate repo, gitignored here)
│   ├── cmd/
│   │   ├── api/               # Server entry point
│   │   └── migrate/           # Goose migrations CLI
│   ├── internal/
│   │   ├── handler/           # HTTP handlers
│   │   ├── middleware/        # JWT, ResolveOrg, Audit, CORS, License
│   │   ├── model/             # GORM models
│   │   ├── database/migrations/  # Goose migration files
│   │   ├── routes/            # Route registration
│   │   ├── dinsightmon/       # Monitoring + DInsight algorithm
│   │   └── service/           # Domain services (deterioration, etc.)
│   ├── docs/                  # Swagger + ops runbooks
│   └── dist/                  # Build output
├── frontend/                  # Next.js dashboard
│   └── src/                   # See frontend/README.md for layout
├── docs/                      # Two living docs + an index pointing at the
│   ├── README.md              # authoritative sources for everything else
│   ├── design-system.md       # FE design system (tokens, primitives, states)
│   └── team-design-brief.md   # Cross-team product + brand brief
├── test-data/                 # Sample CSVs (gitignored)
├── scripts/                   # Operational shell scripts
│   ├── reset-db.sh            # Wipe + reseed the dinsight database
│   └── reset_database.sql     # Equivalent manual SQL (for psql users)
└── README.md
```

## Development

### Backend

```bash
cd Dinsight_API

go run ./cmd/api                    # dev server (port 8080)
go run ./cmd/migrate up             # apply pending migrations
go run ./cmd/migrate down           # roll back one migration
go test ./...                       # unit + integration tests
swag init -g cmd/api/main.go        # regenerate Swagger
gofmt -w .                          # format
```

### Frontend

```bash
cd frontend

pnpm dev              # dev server with Turbopack (port 3000)
pnpm type-check       # tsc --noEmit
pnpm lint             # next lint
pnpm test             # vitest
pnpm test:e2e         # playwright
pnpm format           # prettier --write
pnpm build            # production build
```

### Reset the database

```bash
./scripts/reset-db.sh   # wipes + reseeds the dinsight DB; runnable from any cwd
```

## Troubleshooting

**Database connection failed**
```bash
brew services start postgresql        # macOS
sudo systemctl start postgresql       # Linux
psql -h localhost -U postgres -d dinsight
```

**License validation failed** — check `license.lic` is present in `Dinsight_API/`, file permissions are readable, and the license hasn't expired.

**Port already in use**
```bash
lsof -ti:8080 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Frontend build errors**
```bash
cd frontend
rm -rf node_modules .next
pnpm install
```

**Stale BE response shape after a schema migration** — Go pgx caches prepared statements. Restart the BE after running migrations that change column counts.

### Debug mode

```bash
# Backend
GIN_MODE=debug go run ./cmd/api

# Frontend
NODE_ENV=development pnpm dev
```

## Documentation

- [Frontend overview](./frontend/README.md)
- [Docs index](./docs/README.md)
- [Design system](./docs/design-system.md)
- [Team design brief](./docs/team-design-brief.md)
- [Backend changelog](./Dinsight_API/CHANGELOG.md) — per-week breakdown of the foundation arc
- [Frontend changelog](./frontend/CHANGELOG.md) — frontend half of the same arc
- [Multi-tenancy + RBAC + OIDC + Audit](./Dinsight_API/docs/TENANCY_AND_RBAC.md) — data model, JWT memberships, role matrix, SSO setup, audit log schema
- [NOT NULL migration runbook](./Dinsight_API/docs/RUNBOOK_NOT_NULL_MIGRATION.md) — deploy-day ops runbook for the Week 4 `organization_id NOT NULL` enforcement

## License

Custom commercial license. Contact the project maintainers for terms.