# Uses latest node.js image as a base image.
FROM 	node:18-alpine
 
WORKDIR /app

# Installs SQLite

# RUN apt-get update && apt-get install -y sqlite3

# Installs fastify

# RUN		npm init -y

# RUN		npm install fastify @fastify/static 

# OR installs fastify from package.json

COPY package.json ./

RUN npm install

COPY src ./src

EXPOSE 4000

CMD ["node", "src/index.js"]
