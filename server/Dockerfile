FROM node:20.17.0-bullseye

WORKDIR /client

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3030

CMD ["node", "gameServer.js"]
