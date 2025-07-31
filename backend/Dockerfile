# Uses latest node.js image as a base image.
FROM node:18-alpine
 
WORKDIR /app

COPY package.json ./

RUN npm install

COPY ./api ./api
COPY ./database ./database
COPY app.js app.js

COPY src ./src

RUN apk add --no-cache sqlite

RUN chmod +x ./database/script.sh

EXPOSE 4000

CMD ["sh", "-c", "./database/script.sh && node app.js"]
