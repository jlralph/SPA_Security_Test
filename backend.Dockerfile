FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY backend/package.json ./backend/
COPY backend/src ./backend/src/

WORKDIR /app/backend
RUN npm install

EXPOSE 3000
CMD ["npm", "start"]
