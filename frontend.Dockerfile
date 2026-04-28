FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY frontend/package.json ./frontend/
COPY frontend/angular.json  ./frontend/
COPY frontend/tsconfig*.json ./frontend/
COPY frontend/src ./frontend/src/
COPY frontend/public ./frontend/public/

WORKDIR /app/frontend
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 4200
