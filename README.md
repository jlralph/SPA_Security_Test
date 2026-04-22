# SPA Security Test

An Angular 19 single-page application intended as a testbed for SPA security research. Two runtime modes are available: a static Apache-only setup for fast traffic inspection, and a Docker-based setup with a real Express backend and an integrated OAST server for out-of-band testing.

> **Branch `apache-many`** — Apache serves both frontend and backend. No Node.js process is needed. Each API resource group has its own VirtualHost on a dedicated port, serving pre-baked JSON fixtures from `api-static/`. The Angular app calls each VirtualHost directly — nothing routes through port 4200.
>
> | Port | VirtualHost | Serves |
> |------|-------------|--------|
> | 4200 | Frontend    | Angular SPA static files |
> | 3001 | Auth        | `POST /api/auth/login` → `api-static/auth/login.json` |
> | 3002 | Profile     | `GET /api/profile` → `api-static/profile.json` |
> | 3003 | Users       | `GET/DELETE /api/users/*` → `api-static/users/*.json` |
> | 3004 | Items       | `GET/POST/DELETE /api/items/*` → `api-static/items/*.json` |
>
> Login always succeeds and returns a fixed admin JWT — any credentials are accepted (static demo).
> `DELETE` and `POST /api/items` return correct status codes but do not mutate state.
> All API responses are sent with `Cache-Control: no-store`.

## Project Structure

```
SPA_Security_Test/
├── package.json              # Root scripts
├── apache-many.conf          # Apache config — one VirtualHost per API resource group
├── README.md
├── api-static/               # JSON fixtures served by the API VirtualHosts
│   ├── auth/login.json       # POST /api/auth/login  (fixed admin response)
│   ├── profile.json          # GET  /api/profile
│   ├── users.json            # GET  /api/users
│   ├── users/{1,2,3}.json    # GET  /api/users/:id
│   ├── items.json            # GET  /api/items
│   └── items/{1-4}.json      # GET  /api/items/:id
├── backend/                  # Express 5 + TypeScript API (real backend)
│   └── src/server.ts
├── frontend/                 # Angular 19 SPA
│   ├── angular.json
│   └── src/
└── oast/                     # Docker-based isolated OAST test environment
    ├── docker-compose.yml    # Runs all three services
    ├── backend.Dockerfile
    ├── frontend.Dockerfile
    ├── nginx.conf
    └── server/               # Custom DNS + HTTP interaction capture server
        ├── index.js
        └── package.json
```

---

## Mode 1 — Apache static (this branch)

No real backend. Apache serves pre-baked JSON for all API calls.

### Prerequisites

- Node.js 18+ and npm (to build the Angular app)
- Apache httpd with these modules enabled in `httpd.conf`:

  ```apache
  LoadModule rewrite_module      modules/mod_rewrite.so
  LoadModule headers_module      modules/mod_headers.so
  LoadModule log_forensic_module modules/mod_log_forensic.so
  ```

### Steps

```bash
# 1. Build the Angular app
npm install --prefix frontend
npm run build:frontend
# Output: frontend/dist/frontend/browser/

# 2. Point Apache at the config
#    Add to httpd.conf:
Include "E:/Storage/SPA_Security_Test/apache-many.conf"

# 3. Restart Apache
<ApachePath>/bin/httpd.exe

# 4. Open http://localhost:4200
```

### API Endpoints (Apache mode)

All endpoints except `/api/auth/login` require a `Bearer` token (not validated — static demo).

| Method   | Path              | Port | Auth        |
|----------|-------------------|------|-------------|
| `POST`   | `/api/auth/login` | 3001 | —           |
| `GET`    | `/api/profile`    | 3002 | JWT (unck.) |
| `GET`    | `/api/users`      | 3003 | JWT (unck.) |
| `GET`    | `/api/users/:id`  | 3003 | JWT (unck.) |
| `DELETE` | `/api/users/:id`  | 3003 | JWT (unck.) |
| `GET`    | `/api/items`      | 3004 | JWT (unck.) |
| `GET`    | `/api/items/:id`  | 3004 | JWT (unck.) |
| `POST`   | `/api/items`      | 3004 | JWT (unck.) |
| `DELETE` | `/api/items/:id`  | 3004 | JWT (unck.) |

### Apache logs

Each VirtualHost writes to `E:/Apache24/logs/`:

| VirtualHost | Forensic | Host-audit | Error | Access |
|-------------|----------|------------|-------|--------|
| Auth :3001  | `spa-security-auth-service-forensic.log` | `...-host-audit.log` | `...-error.log` | `...-access.log` |
| Profile :3002 | `spa-security-profile-service-forensic.log` | … | … | … |
| Users :3003   | `spa-security-users-service-forensic.log`   | … | … | … |
| Items :3004   | `spa-security-items-service-forensic.log`   | … | … | … |

---

## Mode 2 — Docker + OAST (isolated local test)

Runs the real Express backend, the Angular SPA (via nginx), and a custom OAST server — all in an isolated Docker network. No public domain or IP required.

### What the OAST server does

- **DNS** (port 53): resolves every `*.oast.local` query to its own IP and logs it.
- **HTTP capture** (port 80): logs every inbound HTTP request (SSRF callbacks).
- **Web UI** (port 8080): live interaction log that updates every 2 seconds.

When the backend's DNS is pointed at the OAST server, any `*.oast.local` lookup triggered by an injected payload appears immediately in the log.

### Network layout

```
oast-net  172.28.0.0/24
├── oast-server   172.28.0.10  — fixed IP so DNS override can reference it
├── webapp-backend              — Express :3000, DNS → 172.28.0.10
└── webapp-frontend             — nginx :4200, proxies /api → webapp-backend
```

### Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)

### Steps

```bash
cd oast
docker compose up --build
```

| URL | Purpose |
|-----|---------|
| `http://localhost:4200` | Angular SPA |
| `http://localhost:8080` | OAST interaction log |

### Triggering a DNS + HTTP interaction

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
2. Backend makes HTTP `GET` to `http://172.28.0.10/callback` → **HTTP entry logged**
3. Both interactions appear at `http://localhost:8080` within 2 seconds

Any unique subdomain can be used as a correlation ID (`abc123`, `user-test`, `payload-1`, etc.).

### API Endpoints (Docker mode)

JWT auth is fully enforced — tokens are cryptographically signed and validated.

| Method   | Path                | Auth          |
|----------|---------------------|---------------|
| `POST`   | `/api/auth/login`   | —             |
| `GET`    | `/api/profile`      | Bearer JWT    |
| `GET`    | `/api/users`        | Bearer JWT    |
| `GET`    | `/api/users/:id`    | Bearer JWT    |
| `DELETE` | `/api/users/:id`    | JWT + admin   |
| `GET`    | `/api/items`        | Bearer JWT    |
| `GET`    | `/api/items/:id`    | Bearer JWT    |
| `POST`   | `/api/items`        | Bearer JWT    |
| `DELETE` | `/api/items/:id`    | JWT + admin   |
| `GET`    | `/api/ssrf-test`    | — (test only) |

---

## Demo Credentials

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `password` | admin |
| `user`   | `password` | user  |
