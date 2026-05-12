# VM smoke-test deployment

Step-by-step guide for deploying the full Dinsight stack (backend + frontend + Postgres + reverse proxy + email-capture) on a single VM with one `docker compose up`. Built from source on the VM. Real customer deploys will pull pre-built images from a registry instead — that's a separate path, not covered here.

## Contents

- [VM smoke-test deployment](#vm-smoke-test-deployment)
  - [Contents](#contents)
  - [What gets deployed](#what-gets-deployed)
  - [Before you start](#before-you-start)
  - [Step 1 — Clone the two repos](#step-1--clone-the-two-repos)
  - [Step 2 — Drop in the license artifacts](#step-2--drop-in-the-license-artifacts)
  - [Step 3 — Configure `.env`](#step-3--configure-env)
  - [Step 4 — Build and start](#step-4--build-and-start)
  - [Step 5 — Verify it works](#step-5--verify-it-works)
  - [About the env files](#about-the-env-files)
  - [Common operations](#common-operations)
  - [Updating to a newer build](#updating-to-a-newer-build)
  - [Going to HTTPS](#going-to-https)
  - [Troubleshooting](#troubleshooting)
  - [Next Steps](#next-steps)

## What gets deployed

Five containers on one private Docker network:

| Container | Role | Host port |
|---|---|---|
| `dinsight-postgres` | Database (Postgres 16) | not exposed |
| `dinsight-api` | Go backend | not exposed |
| `dinsight-frontend` | Next.js dashboard | not exposed |
| `dinsight-caddy` | Reverse proxy. Routes `/api/*` to the backend, everything else to the frontend. | `80`, `443` |
| `dinsight-mailpit` | Captures outbound email so you can see verification + reset flows | `8025` (web UI) |

The browser talks only to Caddy. Same origin for the app and the API means no CORS, cookies behave correctly, and there's a single TLS endpoint when you swap `:80` for a real hostname later.

## Before you start

On the VM:

- **Docker Engine 24+** with the Compose plugin. Check with `docker compose version`.
- **~2 GB free RAM, ~5 GB free disk** (Postgres data + cached image layers grow over time).
- **Network access** to GitHub (to clone the repos), Docker Hub, and `gcr.io` (to pull the distroless base images), unless you're air-gapped — that's a different path not covered here.

You also need two things in the project:

- `license.lic` — the deployment license file.
- The backend repo URL and the dashboard repo URL.

## Step 1 — Clone the two repos

The backend and frontend live in separate repos. Clone them as siblings in any parent directory of your choice:

```sh
mkdir -p ~/dinsight && cd ~/dinsight
git clone <backend-repo-url>      # produces Dinsight_API/
git clone <dashboard-repo-url>    # produces dinsight-dashboard/
ls
# Dinsight_API/  dinsight-dashboard/
```

**You can put them anywhere** — `~/dinsight/` is just a suggestion. The default `.env` values assume sibling directories like above. If you use a different layout, you'll override the paths in step 3.

## Step 2 — Drop in the license artifacts

The backend reads `license.lic` at startup and writes `devices.json` to record registered devices. Put them in the backend clone's root:

```sh
# Drop the license file
cp /path/to/license.lic ~/dinsight/Dinsight_API/license.lic

# Create an empty devices.json (the backend will populate it)
touch ~/dinsight/Dinsight_API/devices.json
```

You do **not** need `public.pem` — the license public key is embedded in the backend binary.

## Step 3 — Configure `.env`

```sh
cd ~/dinsight/dinsight-dashboard/deploy/vm-test
cp .env.example .env
$EDITOR .env
```

Set these values:

| Variable | What to put | Why |
|---|---|---|
| `JWT_SECRET` | `$(openssl rand -hex 32)` | Signs auth tokens. Must be unique per deployment. Never reuse across environments. |
| `PUBLIC_URL` | `http://YOUR_VM_IP` (e.g. `http://10.0.0.42`) or `http://your-host.example.com` | Exact URL the browser hits. The backend allow-lists this for CORS. Must match scheme + host + port. |
| `DINSIGHT_API_PATH` | Default `../../../Dinsight_API` works for the sibling layout from step 1. Override if you put the repos somewhere else. | Build context + license bind-mounts. |
| `DINSIGHT_FE_PATH` | Default `../../frontend` is correct as long as you're inside the dashboard repo. | Build context. |

`POSTGRES_PASSWORD` defaults to `postgres` — fine for a smoke test, change it for any deployment that talks to real users.

`CADDY_HTTP_PORT` / `CADDY_HTTPS_PORT` are commented out by default. Uncomment them if the VM already has something on `:80` or `:443`.

## Step 4 — Build and start

```sh
docker compose up -d --build
```

First run takes **5–10 minutes** — Docker pulls Postgres, Caddy, Mailpit, the Node and distroless base images, then builds both app images. Subsequent runs reuse cached layers and finish in under a minute.

While it builds you can leave it; it runs detached (`-d`).

When the prompt comes back, check that all five services are up:

```sh
docker compose ps
```

Expected: every service shows `Up` and the database + mailpit show `(healthy)`. If anything says `Exit` or `Restarting`, jump to [Troubleshooting](#troubleshooting).

## Step 5 — Verify it works

Three checks, in order:

```sh
# 1. Health endpoint through Caddy
curl http://localhost/api/v1/health
# -> {"status":"ok"} with HTTP 200
```

```sh
# 2. Frontend renders the login page
curl -I http://localhost/login
# -> HTTP/1.1 200 OK
```

```sh
# 3. Login round-trip (uses the seed admin)
curl -sS -X POST http://localhost/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@disum.com","password":"DInsight123!"}'
# -> {"data":{"access_token":"...","user":{"id":1,"email":"admin@disum.com","role":"admin",...}},"success":true}
```

If all three pass, open `http://YOUR_VM_IP` in a browser, sign in with `admin@disum.com` / `DInsight123!`, and upload one of the CSVs from `test-data/` in the dashboard repo to confirm processing works end-to-end.

Mailpit (captured outbound email) is at `http://YOUR_VM_IP:8025`. Useful for confirming password-reset and verification emails are being generated, even without a real SMTP relay.

## About the env files

You'll find three `.env`-style files across the two repos. They serve different purposes and **never share values**. Here's the map:

| File | Read by | When it matters |
|---|---|---|
| `deploy/vm-test/.env` | This `docker compose` setup | **The one you care about for this deploy.** Holds `JWT_SECRET`, `PUBLIC_URL`, source-tree paths. The compose file passes these into the api + frontend containers. |
| `Dinsight_API/.env` | The backend Go binary when run directly on the host (`go run ./cmd/api`) | Only when you're doing host-side backend development. The containerized backend ignores it — env comes from compose. |
| `frontend/.env.local` | The frontend dev server when run directly on the host (`pnpm dev`) | Only when you're doing host-side frontend development. The containerized frontend ignores it — `NEXT_PUBLIC_API_URL` is baked into the build via Docker build-arg. |

Rule of thumb: **for this VM deploy, only edit `deploy/vm-test/.env`**. Setting `JWT_SECRET` in `Dinsight_API/.env` does nothing for the containerized stack — the compose-side env is what reaches the container.

## Common operations

```sh
cd ~/dinsight/dinsight-dashboard/deploy/vm-test

docker compose ps                   # which services are running
docker compose logs -f api          # tail BE logs
docker compose logs -f frontend     # tail FE logs
docker compose logs -f caddy        # see every request hitting the proxy
docker compose logs --tail=50 api   # last 50 lines from one service

docker compose restart api          # restart one service
docker compose stop                 # stop all without removing
docker compose start                # start them back up
docker compose down                 # stop + remove containers (volumes persist)
docker compose down -v              # also wipe Postgres data
```

Reset the database without rebuilding images:

```sh
docker compose exec api /app/reset-db
# Drops public schema, re-runs all migrations, re-seeds the admin account.
```

Browse the database directly:

```sh
docker compose exec postgres psql -U postgres -d dinsight
```

## Updating to a newer build

While you're building from source (not pulling pre-built images yet):

```sh
cd ~/dinsight/Dinsight_API && git pull
cd ~/dinsight/dinsight-dashboard && git pull
cd ~/dinsight/dinsight-dashboard/deploy/vm-test
docker compose up -d --build        # rebuilds only images whose source changed
```

If a backend update includes a schema migration, the new container applies it automatically on startup. If you hit a "cached plan must not change result type" error after a migration, see the troubleshooting section.

## Going to HTTPS

The default config serves on `:80` only. To enable HTTPS once the VM has a real hostname:

1. Make sure the VM is internet-reachable on `:80` and `:443` (Caddy uses HTTP-01 challenge).
2. Open `Caddyfile`, replace the first line `:80 {` with `your-host.example.com {`. Save.
3. `docker compose up -d caddy` — Caddy provisions a Let's Encrypt cert on first start and renews automatically.
4. Update `PUBLIC_URL` in `.env` to `https://your-host.example.com`, then `docker compose up -d api` so the backend allow-lists the new origin.

For air-gapped or "bring your own cert" setups, drop the cert + key into a host directory you bind-mount into the Caddy container, then use `tls /path/to/cert.pem /path/to/key.pem` in the Caddyfile site block.

## Troubleshooting

**`Build context not found: ../../../Dinsight_API`**
Your repos aren't where the defaults expect. Set `DINSIGHT_API_PATH` and `DINSIGHT_FE_PATH` in `.env` to absolute paths (e.g. `/home/ubuntu/dinsight/Dinsight_API`) and re-run `docker compose up -d --build`.

**`license.lic not found` on api startup**
The backend container can't read `license.lic` from `$DINSIGHT_API_PATH`. Verify the file exists at that path and is readable. Restart with `docker compose up -d api`.

**`port is already allocated` on `:80` or `:443`**
Something else on the VM is bound to that port (Apache, nginx, another reverse proxy). Uncomment `CADDY_HTTP_PORT=8080` and `CADDY_HTTPS_PORT=8443` in `.env` to move Caddy off the standard ports. Update `PUBLIC_URL` to include the port too (`http://VM_IP:8080`).

**FE 502s through Caddy right after `up`**
The frontend container is still booting. Next.js standalone takes ~3 seconds to be ready after the process starts. Wait and retry. If 502s persist, `docker compose logs frontend` will show why it isn't listening yet.

**BE returns CORS error in the browser**
`PUBLIC_URL` in `.env` doesn't match the URL the browser is hitting. They have to match exactly — scheme + host + port. Update `.env`, then `docker compose up -d api` to push the new allow-list into the backend.

**`cached plan must not change result type` in BE logs after a migration**
Postgres pgx caches prepared statements per connection. Schema changes (new columns, dropped columns) invalidate the cached plans. Restart the backend so it re-prepares against the new schema: `docker compose restart api`.

**Database is in a weird state**
Easiest recovery is a full reset:
```sh
docker compose exec api /app/reset-db    # data only, schema reused
# or
docker compose down -v && docker compose up -d    # nuclear: rebuild from zero
```

**Want to inspect a container from the inside**
The api + frontend images are distroless (no shell). Postgres, Caddy, and Mailpit have shells:
```sh
docker compose exec postgres sh
docker compose exec caddy sh
docker compose exec mailpit sh
```
For the distroless ones, use `docker compose logs` instead.

## Next Steps

After the VM test, then we can plan for registry image pulls via a chosen container registery and setup proper CI/CD.
