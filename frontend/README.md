# Frontend

Angular 19 SPA — security research testbed. Standalone components, signals-based state, functional guards and interceptors.

## Structure

```
src/
├── app/
│   ├── app.ts                        # Root component (bootstraps Router + HttpClient)
│   ├── app.routes.ts                 # Route definitions
│   ├── guards/
│   │   └── auth.guard.ts             # authGuard — redirects to /login if unauthenticated
│   ├── interceptors/
│   │   └── auth.interceptor.ts       # authInterceptor — attaches Bearer token to all requests
│   ├── models/
│   │   ├── user.model.ts             # User, LoginRequest, LoginResponse
│   │   └── item.model.ts             # Item
│   ├── services/
│   │   ├── auth.ts                   # AuthService — login/logout, JWT storage, signals
│   │   └── api.ts                    # ApiService — users, items, profile HTTP calls
│   └── pages/
│       ├── home/home.ts              # Public home page; shows profile when logged in
│       ├── login/login.ts            # Login form
│       ├── users/users.ts            # User list + delete (authGuard)
│       └── items/items.ts            # Item list + create + delete (authGuard)
└── environments/
    └── environment.ts                # API config — all APIs on :3000
```

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/` | — | — | Redirects to `/home` |
| `/home` | `HomeComponent` | — |
| `/login` | `LoginComponent` | — |
| `/users` | `UsersComponent` | `authGuard` |
| `/items` | `ItemsComponent` | `authGuard` |
| `**` | — | — | Redirects to `/home` |

## Development server

```bash
npm start          # ng serve — dev server on :4200, proxies /api → :3000
npm run watch      # ng build --watch --configuration development
```

Requires the Express backend running on `:3000`. Start it from the repo root:

```bash
npm run dev:backend
```

## Building

```bash
npm run build                        # Production build → dist/frontend/browser/
```

Or via root scripts:

```bash
npm run build:frontend               # Production build
```

## Tests

```bash
npm test           # Vitest via ng test
```

No e2e framework is configured.
