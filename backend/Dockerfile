FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/uploads/avatars /app/uploads/banners && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["node", "src/index.js"]
