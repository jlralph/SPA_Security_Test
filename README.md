# SPA Security Test

An Angular 19 single-page application with an Express 5 REST API backend, intended as a testbed for SPA security research.

> **Branch `apache`** — the Angular frontend is served by Apache httpd instead of the Angular dev server. The Express backend is unchanged.

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
└── frontend/
    ├── angular.json
    ├── proxy.conf.json       # Used by ng serve only (not Apache)
    └── src/
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
                ├── api.ts    # All HTTP calls
                └── auth.ts   # Login/logout/token (signals)
```

## How to Run

### Prerequisites

- Node.js 18+
- npm 9+
- Apache httpd with `mod_rewrite`, `mod_proxy`, and `mod_proxy_http` enabled

### Install dependencies

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Build the Angular app

Apache serves the compiled static files, so build before starting:

```bash
npm run build:frontend
```

Output lands in `frontend/dist/frontend/browser/`.

### Configure Apache

1. Enable the required modules in `httpd.conf`:

   ```apache
   LoadModule rewrite_module    modules/mod_rewrite.so
   LoadModule proxy_module      modules/mod_proxy.so
   LoadModule proxy_http_module modules/mod_proxy_http.so
   ```

2. Add to `httpd.conf` (adjust the path to match your machine):

   ```apache
   Listen 4200
   Include "E:/Storage/SPA_Security_Test/apache.conf"
   ```

3. Restart Apache.

### Start the backend

```bash
npm run dev          # or: npm run dev:backend
```

Starts the Express API on `http://localhost:3000`.

Open `http://localhost:4200` — Apache serves the Angular app and proxies all `/api` requests to the Express backend.

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
