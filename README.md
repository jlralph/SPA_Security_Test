# SPA Security Test

An Angular 19 single-page application with an Express 5 REST API backend, intended as a testbed for SPA security research.

## Project Structure

```
SPA_Security_Test/
├── package.json              # Root dev script (concurrently)
├── README.md
├── backend/
│   ├── package.json
│   └── src/
│       ├── data.ts           # In-memory seed data
│       └── server.ts         # Express 5 API server
└── frontend/
    ├── angular.json
    ├── proxy.conf.json       # Proxies /api → localhost:3000
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

### Install dependencies

From the project root, install root dependencies then each workspace:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Start both servers together

```bash
npm run dev
```

This runs the Angular dev server (`localhost:4200`) and the Express API (`localhost:3000`) concurrently. The Angular proxy forwards all `/api` requests to the backend.

### Start servers individually

```bash
npm run dev:backend    # Express API only  → http://localhost:3000
npm run dev:frontend   # Angular SPA only  → http://localhost:4200
```

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
