FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY src ./src

EXPOSE 4000

CMD ["node", "src/services/mock-server.js"]
