FROM node:20.17.0-bullseye

# Update CA certificates to fix CERT_HAS_EXPIRED issues
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /server

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3030

CMD ["node", "gameServer.js"]
