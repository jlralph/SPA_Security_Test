# SPA Security Test

An Angular 19 single-page application with an Express 5 REST API backend, intended as a testbed for SPA security research.

> **Branch `apache`** — the Angular frontend is served by Apache httpd instead of the Angular dev server. The Express backend is unchanged.

The OAST interaction server (DNS + HTTP callback capture) is included as a standalone Docker service in `oast/`. See [OAST server](#oast-server) below.

## Project Structure

```
SPA_Security_Test/
├── package.json              # Root dev script
├── apache.conf               # Apache virtual host (port 4200, proxies /api → :3000)
├── README.md
├── backend/
│   ├── package.json
│   └── src/
│       ├── data.ts           # In-memory seed data
│       └── server.ts         # Express 5 API server
├── frontend/
│   ├── angular.json
│   ├── proxy.conf.json       # Used by ng serve only (not Apache)
│   └── src/
│       └── app/
│           ├── guards/
│           │   └── auth.guard.ts
│           ├── interceptors/
│           │   └── auth.interceptor.ts
│           ├── models/
│           │   ├── item.model.ts
│           │   └── user.model.ts
│           ├── pages/
│           │   ├── home/
│           │   ├── items/
│           │   ├── login/
│           │   └── users/
│           └── services/
│               ├── api.ts    # All HTTP calls
│               └── auth.ts   # Login/logout/token (signals)
├── oast/                     # OAST interaction server (DNS + HTTP capture)
│   └── server/
│       ├── Dockerfile
│       ├── index.js          # DNS + HTTP capture + web UI
│       └── package.json
├── docker-compose.yml        # Orchestrates oast-server, backend, frontend
├── backend.Dockerfile        # Express API container (Node 20 Alpine + tsx)
├── frontend.Dockerfile       # Angular build → httpd:2.4-alpine serve
├── apache.docker.secure.conf    # Container vhost — hardened (default)
└── apache.docker.insecure.conf  # Container vhost — vulnerable (demo mode)
```

## How to Run

There are two ways to bring up the stack — Docker (everything containerised) or native (Apache on the host, Express on the host).

### Option 1 — Docker (recommended)

Both servers run as containers, no native Apache install needed.

```bash
docker compose up --build
```

Or via npm shorthand:

| Script | Equivalent |
|--------|------------|
| `npm run docker:up` | `docker compose up --build` |
| `npm run docker:start` | `docker compose up` |
| `npm run docker:down` | `docker compose down` |
| `npm run docker:build` | `docker compose build` |

| URL | Purpose |
|-----|---------|
| `http://localhost:4200` | Angular SPA served by Apache (in container) |
| `http://localhost:3000` | Express API direct (in container) |
| `http://localhost:8082` | OAST interaction log (live) |

The frontend container is multi-stage: Node 20 builds the Angular app, then `httpd:2.4-alpine` serves it. The Apache vhost is picked at startup from one of two configs baked into the image — `apache.docker.secure.conf` (default) or `apache.docker.insecure.conf` — controlled by the `APACHE_MODE` env var. See [Apache mode](#apache-mode-secure--insecure).

The backend container's DNS is pointed at the OAST server (`172.30.0.10`) so any `*.oast.local` lookup triggered by injected payloads is captured automatically — no extra config needed.

Apache logs land at `/usr/local/apache2/logs/` inside the frontend container. View them with `docker compose logs -f webapp-frontend` or `docker exec webapp-frontend cat logs/spa-security-forensic.log`.

To start only the OAST server (without the SPA + backend):

```bash
docker compose up oast-server
```

### Option 2 — Native (Apache on host)

#### Prerequisites

- Node.js 18+
- npm 9+
- Apache httpd with `mod_rewrite`, `mod_proxy`, `mod_proxy_http`, and `mod_headers` enabled

#### Install dependencies

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

#### Build the Angular app

Apache serves the compiled static files, so build before starting:

```bash
npm run build:frontend
```

Output lands in `frontend/dist/frontend/browser/`.

#### Configure Apache

1. Enable the required modules in `httpd.conf`:

   ```apache
   LoadModule rewrite_module    modules/mod_rewrite.so
   LoadModule proxy_module      modules/mod_proxy.so
   LoadModule proxy_http_module modules/mod_proxy_http.so
   LoadModule headers_module    modules/mod_headers.so
   ```

2. Add to `httpd.conf` (adjust the path to match your machine):

   ```apache
   Listen 4200
   Include "E:/Storage/SPA_Security_Test/apache.conf"
   ```

3. Restart Apache.

#### Start the backend

```bash
npm run dev          # or: npm run dev:backend
```

Starts the Express API on `http://localhost:3000`.

Open `http://localhost:4200` — Apache serves the Angular app and proxies all `/api` requests to the Express backend.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Express backend (native) |
| `npm run dev:backend` | Start the Express backend (native) |
| `npm run build:frontend` | Build the Angular app for native Apache to serve |
| `npm run docker:up` | Build & start the Docker stack |
| `npm run docker:start` | Start the Docker stack without rebuild |
| `npm run docker:down` | Tear the Docker stack down |
| `npm run docker:build` | Build the Docker images only |

## API Endpoints

All endpoints except `/api/auth/login` require a `Bearer` token in the `Authorization` header.

| Method   | Path               | Auth          | Description            |
|----------|--------------------|---------------|------------------------|
| `POST`   | `/api/auth/login`  | —             | Obtain a JWT token     |
| `GET`    | `/api/profile`     | JWT           | Current user's profile |
| `GET`    | `/api/users`       | JWT           | List all users         |
| `GET`    | `/api/users/:id`   | JWT           | Get a single user      |
| `DELETE` | `/api/users/:id`   | JWT + admin   | Delete a user          |
| `GET`    | `/api/items`       | JWT           | List all items         |
| `GET`    | `/api/items/:id`   | JWT           | Get a single item      |
| `POST`   | `/api/items`       | JWT           | Create an item         |
| `DELETE` | `/api/items/:id`   | JWT + admin   | Delete an item         |

## Apache mode (secure / insecure)

The frontend container ships with two Apache vhost configurations and picks one at startup based on the `APACHE_MODE` env var. Both are baked into the image, so switching modes is a container restart — no rebuild needed.

| Mode | File | Purpose |
|------|------|---------|
| `secure` (default) | `apache.docker.secure.conf` | Hardened — host-header validation, header stripping, `ProxyPreserveHost Off`, `TraceEnable Off`, catch-all 403 vhost |
| `insecure` | `apache.docker.insecure.conf` | Intentionally vulnerable — accepts any Host header, passes client headers through, `ProxyPreserveHost On`, `TraceEnable On`, `ServerAlias *` |

### What's different in `insecure` mode

| Protection (secure) | Removed in insecure | Why it matters |
|---------------------|---------------------|----------------|
| Catch-all vhost rejects unknown Host headers | Any Host accepted | Lets you craft host-header injection payloads |
| `RequestHeader unset` for `X-Forwarded-Host`, `X-Original-Host`, `X-Host`, `X-Rewrite-URL` | Headers pass through | Backend trusts attacker-controlled headers |
| `RequestHeader set X-Forwarded-Host "localhost"` | Not overridden | Backend uses whatever the client sent |
| Host validation rule `^(www\.)?localhost(:\d+)?$` | Not enforced | Arbitrary Host headers reach the backend |
| `ProxyPreserveHost Off` | `On` | Original `Host` header forwarded to Express — enables password-reset poisoning, web-cache poisoning |
| `TraceEnable Off` (Apache default) | `On` | XST-style attacks possible |

### Switching modes

The frontend container picks up `APACHE_MODE` from the shell environment. Syntax differs per shell:

**bash / zsh / git-bash:**
```bash
docker compose up --build                       # secure (default)
APACHE_MODE=insecure docker compose up -d       # insecure
APACHE_MODE=secure   docker compose up -d       # back to secure
```

**Windows CMD:**
```cmd
docker compose up --build
set APACHE_MODE=insecure && docker compose up -d
set APACHE_MODE=secure   && docker compose up -d
set APACHE_MODE=                                  :: clear (back to default)
```

**Windows PowerShell:**
```powershell
docker compose up --build
$env:APACHE_MODE="insecure"; docker compose up -d
$env:APACHE_MODE="secure";   docker compose up -d
Remove-Item Env:APACHE_MODE                       # clear (back to default)
```

Or put `APACHE_MODE=insecure` in a `.env` file at the repo root and just run `docker compose up -d` — Compose reads the file automatically and you avoid shell-specific syntax entirely.

The frontend container will recreate to pick up the new env var. You'll see `Apache starting in <mode> mode` in the logs (`docker compose logs webapp-frontend | head`).

### Demo: host-header injection

After switching to insecure mode:

```bash
curl -H "Host: evil.example.com" http://localhost:4200/api/profile
```

In secure mode this returns `403`. In insecure mode it proxies through and the backend sees `Host: evil.example.com` (visible in `spa-security-host-audit.log` inside the frontend container).

---

## OAST server

The OAST server captures out-of-band DNS and HTTP interactions triggered by injected payloads. With the Docker setup it comes up automatically alongside the backend and frontend (`docker compose up --build`).

| URL | Purpose |
|-----|---------|
| `http://localhost:8082` | Live interaction log (updates every 2 s) |

### What it does

- **DNS** (internal port 53): resolves every `*.oast.local` query to `172.30.0.10` and logs it.
- **HTTP capture** (internal port 80): logs every inbound HTTP request (SSRF callbacks).
- **Web UI** (port 8082 on host): live log of all captured interactions.

### Using it

Craft a payload that causes the Express backend or the SPA to issue a request to any `*.oast.local` subdomain. The subdomain acts as a correlation ID:

```
http://abc123.oast.local/callback
```

The dockerized backend has its DNS resolver pointed at `172.30.0.10`, so any lookup inside the backend container hits the OAST server immediately — no host DNS or hosts-file changes needed.

To resolve `*.oast.local` from the **host** (or from a backend running natively under Option 2), either:

- Add `172.30.0.10 abc123.oast.local` to your hosts file, or
- Uncomment the port 53 lines in `docker-compose.yml` (the `oast-server` service) and point your system DNS at `127.0.0.1` (requires admin/root).

---

## Demo Credentials

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `password` | admin |
| `user`   | `password` | user  |
| `alice`  | `password` | user  |

Admin accounts can delete users and items. Regular user accounts have read and create access only.

## Logs

The Apache vhost writes four log files to `<ApacheRoot>/logs/`:

| File | Purpose |
|------|---------|
| `spa-security-forensic.log`   | Full request capture (via `mod_log_forensic` — every header and body) |
| `spa-security-host-audit.log` | `Host` and `X-Forwarded-Host` audit (custom `hostlog` format) |
| `spa-security-error.log`      | Apache errors for this vhost only |
| `spa-security-access.log`     | Combined access log for this vhost only |

A catch-all VirtualHost at the top of `apache.conf` rejects (`403`) any request whose `Host` header doesn't resolve to `localhost` — useful for spotting host-header injection attempts.
