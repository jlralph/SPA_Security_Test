# SPA Security Test

An Angular 19 single-page application served entirely by Apache httpd, intended as a testbed for SPA security research.

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

For the Docker + real Express backend + OAST DNS testing setup, see branch **`oast-express`**.

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
├── backend/                  # Express 5 + TypeScript API (reference only — not used here)
│   └── src/server.ts
└── frontend/                 # Angular 19 SPA
    ├── angular.json          # build configurations: production, development, apache
    └── src/
        └── environments/
            ├── environment.ts         # default (dev server) — all APIs on :3000
            └── environment.apache.ts  # Apache static — split ports 3001-3004
```

## How to Run

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
# 1. Build the Angular app with the Apache environment
npm install --prefix frontend
npm run build:frontend:apache
# Output: frontend/dist/frontend/browser/

# 2. Point Apache at the config — add to httpd.conf:
Include "E:/Storage/SPA_Security_Test/apache-many.conf"

# 3. Restart Apache
<ApachePath>/bin/httpd.exe

# 4. Open http://localhost:4200
```

## Build Scripts

| Script | Description |
|--------|-------------|
| `npm run build:frontend:apache` | Build with the Apache environment (split ports 3001-3004) |
| `npm run build:frontend` | Build with the default environment (all APIs on :3000) |

## API Endpoints

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

JWT (unck.) — token is forwarded but not cryptographically validated (no backend process).

## Demo Credentials

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `password` | admin |
| `user`   | `password` | user  |

## Logs

Each VirtualHost writes to `E:/Apache24/logs/`:

| VirtualHost | Forensic log | Host-audit log | Error log | Access log |
|-------------|-------------|----------------|-----------|------------|
| Auth :3001  | `spa-security-auth-service-forensic.log` | `spa-security-auth-service-host-audit.log` | `spa-security-auth-service-error.log` | `spa-security-auth-service-access.log` |
| Profile :3002 | `spa-security-profile-service-forensic.log` | `spa-security-profile-service-host-audit.log` | `spa-security-profile-service-error.log` | `spa-security-profile-service-access.log` |
| Users :3003 | `spa-security-users-service-forensic.log` | `spa-security-users-service-host-audit.log` | `spa-security-users-service-error.log` | `spa-security-users-service-access.log` |
| Items :3004 | `spa-security-items-service-forensic.log` | `spa-security-items-service-host-audit.log` | `spa-security-items-service-error.log` | `spa-security-items-service-access.log` |
