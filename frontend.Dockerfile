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
    echo "Include conf/extra/apache.docker.active.conf" >> /usr/local/apache2/conf/httpd.conf

# Both variants are baked into the image. The chosen one is selected at
# container startup via the APACHE_MODE env var (secure | insecure).
COPY apache.docker.secure.conf   /usr/local/apache2/conf/extra/apache.docker.secure.conf
COPY apache.docker.insecure.conf /usr/local/apache2/conf/extra/apache.docker.insecure.conf

# Wipe the default htdocs and drop in the built Angular SPA
RUN rm -rf /usr/local/apache2/htdocs/*
COPY --from=build /app/frontend/dist/frontend/browser/ /usr/local/apache2/htdocs/

EXPOSE 4200

# At startup: pick the requested config (default: secure) and exec httpd.
ENV APACHE_MODE=secure
CMD ["sh", "-c", "src=/usr/local/apache2/conf/extra/apache.docker.${APACHE_MODE}.conf; if [ ! -f \"$src\" ]; then echo \"ERROR: APACHE_MODE='${APACHE_MODE}' — expected 'secure' or 'insecure'\" >&2; exit 1; fi; cp \"$src\" /usr/local/apache2/conf/extra/apache.docker.active.conf; echo \"Apache starting in ${APACHE_MODE} mode\"; exec httpd-foreground"]
