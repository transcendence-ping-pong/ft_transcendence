FROM node:20-alpine

WORKDIR /app

# COPY package.json package-lock.json ./
COPY package.json ./

RUN npm install

# COPY . .

COPY src ./src

EXPOSE 4000

CMD ["node", "src/index.js"]
