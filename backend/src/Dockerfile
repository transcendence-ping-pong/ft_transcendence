FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install
COPY . .

EXPOSE 3000
RUN ls -la /app
CMD ["npm", "start"]

# FROM node:20-alpine

# WORKDIR /app

# COPY package.json ./

# RUN npm install

# COPY . .

# EXPOSE 4000

# CMD ["node", "index.js"]
