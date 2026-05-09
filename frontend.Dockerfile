# ── Stage 1: build the Angular app ───────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY frontend/package.json ./frontend/
COPY frontend/angular.json ./frontend/
COPY frontend/tsconfig*.json ./frontend/
COPY frontend/src ./frontend/src/
COPY frontend/public ./frontend/public/

WORKDIR /app/frontend
RUN npm install
RUN npm run build

# ── Stage 2: serve the built SPA from Apache httpd ───────────────────────────
FROM httpd:2.4-alpine

# Enable required modules and switch the default Listen from 80 to 4200
RUN sed -i \
    -e 's|^#\(LoadModule rewrite_module modules/mod_rewrite.so\)|\1|' \
    -e 's|^#\(LoadModule proxy_module modules/mod_proxy.so\)|\1|' \
    -e 's|^#\(LoadModule proxy_http_module modules/mod_proxy_http.so\)|\1|' \
    -e 's|^#\(LoadModule headers_module modules/mod_headers.so\)|\1|' \
    -e 's|^#\(LoadModule log_forensic_module modules/mod_log_forensic.so\)|\1|' \
    -e 's|^Listen 80$|Listen 4200|' \
    /usr/local/apache2/conf/httpd.conf && \
    echo "Include conf/extra/apache.docker.conf" >> /usr/local/apache2/conf/httpd.conf

COPY apache.docker.conf /usr/local/apache2/conf/extra/apache.docker.conf

# Wipe the default htdocs and drop in the built Angular SPA
RUN rm -rf /usr/local/apache2/htdocs/*
COPY --from=build /app/frontend/dist/frontend/browser/ /usr/local/apache2/htdocs/

EXPOSE 4200
