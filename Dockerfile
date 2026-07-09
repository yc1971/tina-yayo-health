FROM node:20-slim

WORKDIR /app

# Copy everything
COPY . .

# Install ALL dependencies (including dev for build)
RUN npm ci

# Build the app
RUN npm run build

# Clean dev dependencies after build
RUN npm prune --omit=dev

ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
