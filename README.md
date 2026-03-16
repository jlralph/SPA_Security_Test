# SPA Security Test

An Angular 19 single-page application with an Express 5 REST API backend, intended as a testbed for SPA security research.

> **Branch `apache-many`** — Apache serves both frontend and backend entirely. No Node.js process is needed. Each API resource group has its own VirtualHost on a dedicated port, serving pre-baked JSON fixtures from `api-static/`. The frontend calls each VirtualHost directly.
>
> | Port | VirtualHost | Serves |
> |------|-------------|--------|
> | 4200 | Frontend    | Angular SPA static files |
> | 3001 | Auth API    | `POST /api/auth/login` → `api-static/auth/login.json` |
> | 3002 | Profile API | `GET /api/profile` → `api-static/profile.json` |
> | 3003 | Users API   | `GET/DELETE /api/users/*` → `api-static/users/*.json` |
> | 3004 | Items API   | `GET/POST/DELETE /api/items/*` → `api-static/items/*.json` |
>
> Login always succeeds and returns a fixed admin JWT — any credentials are accepted (static demo).

## Project Structure

```
SPA_Security_Test/
├── package.json              # Root scripts (only build:frontend needed)
├── apache-many.conf          # Apache config — one VirtualHost per API resource group
├── README.md
├── api-static/               # Static JSON fixtures served by Apache API VirtualHosts
│   ├── auth/
│   │   └── login.json        # POST /api/auth/login response
│   ├── profile.json          # GET  /api/profile response
│   ├── users.json            # GET  /api/users response
│   ├── users/
│   │   ├── 1.json            # GET  /api/users/1
│   │   ├── 2.json
│   │   └── 3.json
│   ├── items.json            # GET  /api/items response
│   └── items/
│       ├── 1.json – 4.json   # GET  /api/items/:id
│       └── created.json      # POST /api/items stub response
├── backend/                  # Express source — not used in this branch (kept for reference)
└── frontend/
    ├── angular.json
    └── src/
        ├── environments/
        │   └── environment.ts  # API base URLs per VirtualHost port
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
                └── auth.ts   # Login/logout/token (signals)
```

## How to Run

### Prerequisites

- Node.js 18+ and npm 9+ (only needed to build the Angular app)
- Apache httpd with `mod_rewrite` and `mod_headers` enabled

### Install and build the Angular app

```bash
npm install --prefix frontend
npm run build:frontend
```

Output lands in `frontend/dist/frontend/browser/`.

### Configure Apache

1. Enable the required modules in `httpd.conf`:

   ```apache
   LoadModule rewrite_module  modules/mod_rewrite.so
   LoadModule headers_module  modules/mod_headers.so
   ```

2. Add to `httpd.conf` (adjust the path to match your machine).
   Remove any other `apache.conf` / `apache-many.conf` Include first:

   ```apache
   Include "E:/Storage/SPA_Security_Test/apache-many.conf"
   ```

3. Restart Apache.

No backend process is needed — Apache serves everything directly.

Open `http://localhost:4200`. The Angular app calls each API VirtualHost on its own port (`localhost:3001` – `localhost:3004`).

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Express backend |
| `npm run dev:backend` | Start the Express backend |
| `npm run build:frontend` | Build the Angular app for Apache to serve |

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

## Demo Credentials

| Username | Password   | Role  |
|----------|------------|-------|
| `admin`  | `password` | admin |
| `user`   | `password` | user  |

Admin accounts can delete users and items. Regular user accounts have read and create access only.
