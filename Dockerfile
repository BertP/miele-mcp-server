FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Create a directory for sqlite db and set permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
ENV DATABASE_PATH=/app/data/miele-mcp.sqlite
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
