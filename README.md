# SPA Security Test

An Angular SPA intended as a testbed for SPA security research. This branch (`oast-express`) runs a real Express 5 backend with full JWT authentication and includes a Docker-based OAST server for out-of-band interaction testing.

## Project Structure

```
SPA_Security_Test/
├── docker-compose.yml        # Orchestrates all three services
├── backend.Dockerfile
├── frontend.Dockerfile
├── nginx.conf                # nginx config for the frontend container
├── .env.example              # Network layout reference
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
| `http://localhost:8080` | OAST interaction log |

---

## Network layout

```
oast-net  172.30.0.0/24
├── oast-server   172.30.0.10  — fixed IP so DNS override can reference it
├── webapp-backend              — Express :3000, DNS → 172.30.0.10
└── webapp-frontend             — nginx :4200, proxies /api → webapp-backend
```

The backend's DNS is pointed at the OAST server. Any `*.oast.local` lookup triggered by an injected payload appears immediately in the interaction log at `http://localhost:8080`.

---

## What the OAST server does

- **DNS** (port 53): resolves every `*.oast.local` query to its own IP and logs it.
- **HTTP capture** (port 80): logs every inbound HTTP request (SSRF callbacks).
- **Web UI** (port 8080): live interaction log that updates every 2 seconds.

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
3. Both interactions appear at `http://localhost:8080` within 2 seconds

Any unique subdomain can be used as a correlation ID (`abc123`, `user-test`, `payload-1`, etc.).

---

## Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password` | admin |
| `user` | `password` | user |
