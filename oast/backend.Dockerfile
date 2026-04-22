FROM node:20-alpine
WORKDIR /app

# Copy root package.json — backend lists it as a file: dependency
COPY package.json ./

# Copy backend source
COPY backend/package.json ./backend/
COPY backend/src ./backend/src/

WORKDIR /app/backend
RUN npm install --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
