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

## Project Structure

```
SPA_Security_Test/
├── package.json              # Root scripts (build:frontend only)
├── apache-many.conf          # Apache config — one VirtualHost per API resource group
├── README.md
├── api-static/               # JSON fixtures served by the API VirtualHosts
│   ├── auth/
│   │   └── login.json        # POST /api/auth/login  (fixed admin response)
│   ├── profile.json          # GET  /api/profile
│   ├── users.json            # GET  /api/users
│   ├── users/
│   │   ├── 1.json            # GET  /api/users/1
│   │   ├── 2.json            # GET  /api/users/2
│   │   └── 3.json            # GET  /api/users/3
│   ├── items.json            # GET  /api/items
│   └── items/
│       ├── 1.json            # GET  /api/items/1
│       ├── 2.json            # GET  /api/items/2
│       ├── 3.json            # GET  /api/items/3
│       ├── 4.json            # GET  /api/items/4
│       └── created.json      # POST /api/items  (fixed stub response)
├── backend/                  # Express 5 source — not used in this branch (reference only)
└── frontend/
    ├── angular.json
    └── src/
        ├── environments/
        │   └── environment.ts  # API base URLs keyed by resource group
        └── app/
            ├── guards/
            │   └── auth.guard.ts
            ├── interceptors/
            │   └── auth.interceptor.ts
            ├── models/
            │   ├── item.model.ts
            │   └── user.model.ts
            ├── pages/
            │   ├── home/
            │   ├── items/
            │   ├── login/
            │   └── users/
            └── services/
                ├── api.ts    # HTTP calls — absolute URLs from environment
                └── auth.ts   # Login / logout / token storage (signals)
```

## How to Run

### Prerequisites

- Node.js 18+ and npm 9+ (only needed to build the Angular app)
- Apache httpd with the following modules enabled in `httpd.conf`:

  ```apache
  LoadModule rewrite_module      modules/mod_rewrite.so
  LoadModule headers_module      modules/mod_headers.so
  LoadModule log_forensic_module modules/mod_log_forensic.so
  ```

### Build the Angular app

Apache serves the compiled static files, so build once before starting (and rebuild after any frontend change):

```bash
npm install --prefix frontend
npm run build:frontend
```

Output lands in `frontend/dist/frontend/browser/`.

### Configure Apache

Add to `httpd.conf`, replacing any existing `apache.conf` or `apache-many.conf` Include:

```apache
Include "E:/Storage/SPA_Security_Test/apache-many.conf"
```

Then restart Apache:

```
E:\Apache24\bin\httpd.exe -k restart
```

No backend process is needed — Apache serves everything.

Open `http://localhost:4200`.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run build:frontend` | Build the Angular app for Apache to serve |

## API Endpoints

All endpoints except `/api/auth/login` require a `Bearer` token in the `Authorization` header (token is not validated — static demo).

| Method   | Path              | Port | Auth        | Static fixture              |
|----------|-------------------|------|-------------|----------------------------|
| `POST`   | `/api/auth/login` | 3001 | —           | `auth/login.json`          |
| `GET`    | `/api/profile`    | 3002 | JWT (unck.) | `profile.json`             |
| `GET`    | `/api/users`      | 3003 | JWT (unck.) | `users.json`               |
| `GET`    | `/api/users/:id`  | 3003 | JWT (unck.) | `users/:id.json`           |
| `DELETE` | `/api/users/:id`  | 3003 | JWT (unck.) | 204 No Content             |
| `GET`    | `/api/items`      | 3004 | JWT (unck.) | `items.json`               |
| `GET`    | `/api/items/:id`  | 3004 | JWT (unck.) | `items/:id.json`           |
| `POST`   | `/api/items`      | 3004 | JWT (unck.) | `items/created.json`       |
| `DELETE` | `/api/items/:id`  | 3004 | JWT (unck.) | 204 No Content             |

JWT (unck.) — token is forwarded but not cryptographically validated (no backend process).

## Demo Credentials

Any username and password are accepted. The login endpoint always returns a fixed admin JWT and the admin user object.

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `password` | admin |
| `user`   | `password` | user  |

## Logs

Each VirtualHost writes to its own set of log files under `E:/Apache24/logs/`:

| VirtualHost | Forensic log | Host-audit log | Error log | Access log |
|-------------|-------------|----------------|-----------|------------|
| Auth :3001  | `spa-security-auth-service-forensic.log` | `spa-security-auth-service-host-audit.log` | `spa-security-auth-service-error.log` | `spa-security-auth-service-access.log` |
| Profile :3002 | `spa-security-profile-service-forensic.log` | `spa-security-profile-service-host-audit.log` | `spa-security-profile-service-error.log` | `spa-security-profile-service-access.log` |
| Users :3003 | `spa-security-users-service-forensic.log` | `spa-security-users-service-host-audit.log` | `spa-security-users-service-error.log` | `spa-security-users-service-access.log` |
| Items :3004 | `spa-security-items-service-forensic.log` | `spa-security-items-service-host-audit.log` | `spa-security-items-service-error.log` | `spa-security-items-service-access.log` |
