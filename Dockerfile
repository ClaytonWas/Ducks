# Multi-stage build for production
FROM node:20.17.0-bullseye as base

# Install dependencies for sqlite3
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Build client
FROM base as client-builder
WORKDIR /client
COPY client/package*.json ./
RUN npm install && \
    cd node_modules/sqlite3 && \
    npm run rebuild && \
    cd ../..
COPY client/ .

# Build server
FROM base as server-builder
WORKDIR /server
COPY server/package*.json ./
RUN npm install
COPY server/ .

# Final stage
FROM base
WORKDIR /app

# Copy built applications
COPY --from=client-builder /client /app/client
COPY --from=server-builder /server /app/server

# Initialize database
WORKDIR /app/client
RUN node ./db/dbs.js

# Expose ports
EXPOSE 3000 3030

# Use docker-compose for orchestration
CMD ["sh", "-c", "cd /app/server && node gameServer.js & cd /app/client && node profileServer.js"]

