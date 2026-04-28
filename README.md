# SPA Security Test

An Angular 19 single-page application intended as a testbed for SPA security research. This branch (`oast-express`) runs a real Express 5 backend with full JWT authentication and includes a Docker-based OAST server for out-of-band interaction testing.

## Project Structure

```
SPA_Security_Test/
├── package.json              # Root scripts
├── README.md
├── backend/                  # Express 5 + TypeScript API
│   ├── package.json
│   └── src/
│       ├── server.ts         # Entry point, routes, middleware
│       └── data.ts           # In-memory users and items
├── frontend/                 # Angular 19 SPA
│   ├── angular.json          # Build configurations: production, development, apache
│   ├── proxy.conf.json       # Dev proxy: /api → :3000
│   └── src/
│       ├── environments/
│       │   ├── environment.ts         # Docker/local — all APIs on :3000
│       │   └── environment.apache.ts  # Apache static — split ports 3001–3004
│       └── app/
│           ├── guards/auth.guard.ts
│           ├── interceptors/auth.interceptor.ts
│           ├── services/{auth,api}.ts
│           ├── models/{user,item}.model.ts
│           └── pages/{login,home,users,items}/
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

## Mode 1 — Local development

Runs the Express backend directly with the Angular CLI dev server.

### Prerequisites

- Node.js 18+ and npm

### Steps

```bash
# Install dependencies
npm install --prefix backend
npm install --prefix frontend

# Terminal 1 — Express backend on :3000
npm run dev:backend

# Terminal 2 — Angular dev server on :4200 (proxies /api → :3000)
cd frontend && npm start
```

### Root scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express backend on :3000 |
| `npm run dev:backend` | Same as above |
| `npm run build:frontend` | Production build of Angular app |
| `npm run build:frontend:apache` | Build Angular app with Apache environment (split ports 3001–3004) |

### API Endpoints

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

The frontend image runs `ng build` (default `production` configuration), which picks up `environment.ts` — all API calls route to the Express backend on `:3000`.

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Express API (direct) |
| `http://localhost:4200` | Angular SPA (via nginx) |
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

---

## Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password` | admin |
| `user` | `password` | user |
