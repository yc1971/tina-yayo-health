FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - lean image
FROM node:20-slim AS runner

WORKDIR /app

# Copy only what's needed to run
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
