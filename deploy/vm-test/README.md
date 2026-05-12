# VM smoke-test deployment

The full Dinsight stack (BE + FE + Postgres + reverse proxy + email-capture) on a single VM.

## What's in here

- `compose.yml` — five services wired together on one Docker network.
- `Caddyfile` — reverse proxy: `/api/*` → BE, everything else → FE.
- `.env.example` — copy to `.env` and fill in.

## Prerequisites on the VM

- Docker Engine 24+ and the Compose plugin (`docker compose version`).
- ~2 GB of free RAM, ~5 GB of disk (Postgres data + cached image layers grow over time).
- Both repos cloned somewhere reachable from this directory. Default layout:

  ```
  <parent>/
    ├── Dinsight_API/        # BE clone
    └── dinsight-dashboard/  # FE clone (this README is in here)
  ```

  Different layout? Set `DINSIGHT_API_PATH` and `DINSIGHT_FE_PATH` in `.env` to wherever you put them.

- The BE clone needs `license.lic` and `public.pem` at its root. `devices.json` is auto-created on first boot if it doesn't exist:

  ```sh
  touch <DINSIGHT_API_PATH>/devices.json
  ```

## Bring it up

```sh
cd dinsight-dashboard/deploy/vm-test

cp .env.example .env
$EDITOR .env                       # set JWT_SECRET, PUBLIC_URL, paths

docker compose up -d --build       # first run pulls + builds; ~5-10 min
docker compose ps                  # all five services should be Up
```

Smoke-test:

```sh
curl http://localhost/api/v1/health    # -> 200
open http://localhost                  # FE login page
```

Login as `admin@disum.com` / `DInsight123!` (provisioned by migrations), upload a baseline CSV, watch it process.

Mailpit captures every outbound email at `http://VM-IP:8025` (no real SMTP needed for the smoke test).

## Common operations

```sh
docker compose logs -f api          # tail BE logs
docker compose logs -f frontend     # tail FE logs
docker compose logs -f caddy        # see proxy access log

docker compose restart api          # restart one service
docker compose pull                 # (when we move to registry)

docker compose down                 # stop everything; data persists
docker compose down -v              # stop and wipe the database too
```

Reset the database without rebuilding:

```sh
docker compose exec api /app/reset-db    # drops public schema, re-runs migrations
```

## Updating

While we're building from source on the VM:

```sh
cd ../../              # back to dashboard repo root
git pull
cd ../Dinsight_API
git pull
cd ../dinsight-dashboard/deploy/vm-test
docker compose up -d --build       # rebuilds whichever images changed
```

## Troubleshooting

**`Build context not found`**
Your repos aren't where the defaults expect. Set `DINSIGHT_API_PATH` and `DINSIGHT_FE_PATH` in `.env` to absolute paths and try again.

**`license.lic not found` on api startup**
Drop `license.lic` and `public.pem` into the BE clone's root, then restart the api service.

**`port is already allocated` on `:80`**
Something else on the VM is on port 80. Set `CADDY_HTTP_PORT=8080` in `.env` and access the FE at `http://VM-IP:8080`.

**FE 502s through Caddy**
The FE container is still booting. Standalone Next.js takes ~5 seconds to be ready after start. Wait + retry; if it's still failing, `docker compose logs frontend`.

**BE returns CORS error in the browser**
`PUBLIC_URL` in `.env` doesn't match the URL the browser is hitting. They have to match exactly (scheme + host + port). Update `.env`, `docker compose up -d api`.

**Stale BE schema after a migration**
Postgres pgx caches prepared statements; after a `migrate up` you may need `docker compose restart api` so the BE re-prepares against the new schema.
