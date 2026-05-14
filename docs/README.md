# Docs

Two living docs. Anything else has a more authoritative source elsewhere.

| Doc | Audience | What it covers |
|---|---|---|
| [`design-system.md`](./design-system.md) | Designers + frontend engs | Tokens, primitives, the seven-state model, layout rules. Source of truth for the FE look + behavior. |
| [`team-design-brief.md`](./team-design-brief.md) | Cross-team (dashboard + mobile + landing) | Product context, brand voice, shared visual direction. Read first if you're new. |

## Where else to look

| You want | Look in |
|---|---|
| API reference | [Swagger UI](http://localhost:8080/swagger/index.html) (auto-generated from handler annotations) |
| Backend operations + multi-tenancy data model | [`Dinsight_API_Enhanced/docs/TENANCY_AND_RBAC.md`](../Dinsight_API_Enhanced/docs/TENANCY_AND_RBAC.md) |
| NOT NULL migration runbook | [`Dinsight_API_Enhanced/docs/RUNBOOK_NOT_NULL_MIGRATION.md`](../Dinsight_API_Enhanced/docs/RUNBOOK_NOT_NULL_MIGRATION.md) |
| Frontend setup, scripts, src layout, conventions | [`frontend/README.md`](../frontend/README.md) |
| Project-wide setup, prerequisites | [`README.md`](../README.md) |
| Per-week feature arc | [`Dinsight_API_Enhanced/CHANGELOG.md`](../Dinsight_API_Enhanced/CHANGELOG.md) and [`frontend/CHANGELOG.md`](../frontend/CHANGELOG.md) |
| Database schema | Migration files in [`Dinsight_API_Enhanced/internal/database/migrations/`](../Dinsight_API_Enhanced/internal/database/migrations/) — authoritative. Any standalone schema doc would drift on the first migration. |
