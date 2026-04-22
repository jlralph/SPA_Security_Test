# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Copy root package.json — frontend lists it as a file: dependency
COPY package.json ./

# Copy frontend source
COPY frontend/package.json ./frontend/
COPY frontend/angular.json  ./frontend/
COPY frontend/tsconfig*.json ./frontend/
COPY frontend/src ./frontend/src/
COPY frontend/public ./frontend/public/

WORKDIR /app/frontend
RUN npm install
RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY oast/nginx.conf /etc/nginx/conf.d/default.conf
# Angular 17+ outputs browser files in dist/<project>/browser/
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 4200
