FROM node:20.17.0-bullseye

RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /client

COPY package*.json ./

# Try a multi-step rebuild process
RUN npm install && \
    cd node_modules/sqlite3 && \
    npm run rebuild && \
    cd ../..

COPY . .

# Initialize database on container start
RUN node ./db/dbs.js || echo "Database initialization attempted"

EXPOSE 3000

# Initialize database and start server
CMD ["sh", "-c", "node ./db/dbs.js && node profileServer.js"]