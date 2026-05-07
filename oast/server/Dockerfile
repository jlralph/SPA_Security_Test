FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
# RUN npm install --omit=dev
COPY index.js ./
EXPOSE 53/udp 53/tcp 80 8080
CMD ["node", "index.js"]
