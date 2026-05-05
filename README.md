# SPA Security Test

An Angular SPA intended as a testbed for SPA security research. This branch (`oast-express`) runs a real Express 5 backend with full JWT authentication and includes a Docker-based OAST server for out-of-band interaction testing.

## Project Structure

```
SPA_Security_Test/
├── docker-compose.yml        # Orchestrates all services
├── backend.Dockerfile
├── frontend.Dockerfile
├── nginx.conf                # nginx config for the frontend container
├── zap.yaml                  # ZAP Automation Framework plan (passive scan)
├── .env.example              # Network layout reference
├── reports/                  # ZAP HTML reports (mounted into zap container)
├── backend/                  # Express 5 + TypeScript API
│   ├── package.json
│   └── src/
│       ├── server.ts         # Entry point, routes, middleware
│       └── data.ts           # In-memory users and items
├── frontend/                 # Angular SPA
│   ├── angular.json
│   ├── package.json
│   └── src/
│       ├── index.html
│       ├── main.ts
│       ├── styles.scss
│       ├── environments/
│       │   └── environment.ts
│       └── app/
│           ├── app.ts / app.html / app.scss / app.routes.ts / app.config.ts
│           ├── guards/auth.guard.ts
│           ├── interceptors/auth.interceptor.ts
│           ├── services/{auth,api}.ts
│           ├── models/{user,item}.model.ts
│           └── pages/{login,home,users,items}/
├── proxy/                    # Logging HTTP proxy
│   ├── Dockerfile
│   └── index.js
└── oast/
    └── server/               # Custom DNS + HTTP interaction capture server
        ├── Dockerfile
        ├── index.js
        └── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 21, TypeScript 5.9, RxJS 7.8, Vitest |
| Backend | Express 5, TypeScript 5.9, jsonwebtoken 9 |
| OAST server | Node 20, dns2 |
| Logging proxy | Node 20, zero dependencies |
| Scanner | OWASP ZAP stable (daemon + CLI scan scripts) |
| Container | Docker Compose, nginx, Node 20 Alpine |

---

## Running the app

Everything runs in Docker. No local Node.js installation required.

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

### Start

```bash
docker compose up --build
```

Or use the npm script shorthand (requires Node.js only for the script runner):

```bash
npm start       # docker compose up --build
npm run up      # docker compose up (skip rebuild)
npm run stop    # docker compose down
npm run build   # docker compose build
```

| URL | Purpose |
|-----|---------|
| `http://localhost:4200` | Angular SPA (via nginx) |
| `http://localhost:3000` | Express API (direct) |
| `http://localhost:8080` | Logging proxy (point browser/tools here) |
| `http://localhost:8082` | OAST interaction log |
| `http://localhost:8090/UI/` | ZAP daemon UI |

Proxy traffic is logged to stdout — view it with:

```bash
docker compose logs -f proxy
```

---

## Network layout

```
oast-net  172.30.0.0/24
├── oast-server   172.30.0.10  — fixed IP so DNS override can reference it
├── proxy                      — logging proxy :8080
├── webapp-backend              — Express :3000, DNS → 172.30.0.10, HTTP(S) → proxy:8080
└── webapp-frontend             — nginx :4200, proxies /api → webapp-backend
```

The backend's DNS is pointed at the OAST server. Any `*.oast.local` lookup triggered by an injected payload appears immediately in the interaction log at `http://localhost:8082`.

All outbound HTTP/HTTPS from the backend and frontend is routed through the logging proxy. HTTP requests (method, URL, body) are logged to stdout; HTTPS tunnels log the destination hostname via CONNECT. View with `docker compose logs -f proxy`.

---

## What the OAST server does

- **DNS** (port 53): resolves every `*.oast.local` query to its own IP and logs it.
- **HTTP capture** (port 80): logs every inbound HTTP request (SSRF callbacks).
- **Web UI** (port 8080 internal / 8082 on host): live interaction log that updates every 2 seconds.

---

## API endpoints

JWT auth is fully enforced — tokens are cryptographically signed and validated.

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/login` | — |
| `GET` | `/api/profile` | Bearer JWT |
| `GET` | `/api/users` | Bearer JWT |
| `GET` | `/api/users/:id` | Bearer JWT |
| `DELETE` | `/api/users/:id` | JWT + admin |
| `GET` | `/api/items` | Bearer JWT |
| `GET` | `/api/items/:id` | Bearer JWT |
| `POST` | `/api/items` | Bearer JWT |
| `DELETE` | `/api/items/:id` | JWT + admin |
| `GET` | `/api/ssrf-test` | — (test only) |

### Backend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Express listen port |
| `JWT_SECRET` | *(required)* | JWT signing secret — process exits if missing |

---

## Triggering a DNS + HTTP interaction

The backend exposes an intentionally vulnerable SSRF endpoint for testing:

```
GET /api/ssrf-test?url=<target>
```

Use any `*.oast.local` payload to generate an interaction:

```bash
curl "http://localhost:4200/api/ssrf-test?url=http://abc123.oast.local/callback"
```

Flow:
1. Backend resolves `abc123.oast.local` → DNS query hits OAST server → **DNS entry logged**
2. Backend makes HTTP `GET` to `http://172.30.0.10/callback` → **HTTP entry logged**
3. Both interactions appear at `http://localhost:8082` within 2 seconds

Any unique subdomain can be used as a correlation ID (`abc123`, `user-test`, `payload-1`, etc.).

---

## ZAP scanning

OWASP ZAP runs as a persistent daemon on port 8090. Reports are written to `./reports/` on the host (mounted as `/zap/wrk` inside the container).

### Automation Framework plan

`reports/zap.yaml` (accessible inside the container at `/zap/wrk/zap.yaml`) drives a full authenticated scan:

1. **Authenticates** as `admin / password` via `POST /api/auth/login` (JSON body)
2. **Injects** the returned JWT as `Authorization: Bearer <token>` on every request
3. **Spiders** the SPA (2 min), runs passive rules, then launches an active scan
4. **Writes** `reports/full.html`

Both `admin` and `user` credentials are declared so ZAP can re-authenticate if a session expires mid-scan.

Run the plan:

```bash
# Via the daemon REST API
curl "http://localhost:8090/JSON/automation/action/runPlan/?filePath=/zap/wrk/zap.yaml"

# Or as a one-off container
docker compose run --rm zap zap.sh -cmd -autorun /zap/wrk/zap.yaml
```

### One-off CLI scans

Run as a throwaway container against the live stack. ZAP manages its own lifecycle — the daemon service is not used.

```bash
# Baseline (passive only — spider + passive rules, ~1 min)
docker compose run --rm zap zap-baseline.py \
  -t http://webapp-frontend:4200 -r baseline.html

# Full scan (active attack — takes several minutes)
docker compose run --rm zap zap-full-scan.py \
  -t http://webapp-frontend:4200 -r full.html

# API scan (requires an OpenAPI spec or HAR file)
docker compose run --rm zap zap-api-scan.py \
  -t http://webapp-backend:3000/openapi.json -f openapi -r api.html
```

HTML reports land at `reports/<filename>.html` on the host.

### Daemon REST API

The ZAP daemon exposes a full REST API at `http://localhost:8090/JSON/`. Useful one-liners:

```bash
# Spider the SPA
curl "http://localhost:8090/JSON/spider/action/scan/?url=http://webapp-frontend:4200"

# Start an active scan
curl "http://localhost:8090/JSON/ascan/action/scan/?url=http://webapp-frontend:4200&recurse=true"

# Fetch the HTML report (saves to reports/ via mounted volume)
curl "http://localhost:8090/OTHER/core/other/htmlreport/" > reports/zap-report.html
```

---

## Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password` | admin |
| `user` | `password` | user |
