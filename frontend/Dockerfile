# FROM node:18-alpine

# WORKDIR /app

# COPY package.json package-lock.json ./

# RUN npm install

# COPY . .

# EXPOSE 3000

# CMD ["npm", "run", "dev", "--", "--host"]

FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]

EXPOSE 3000

CMD ["sh", "-c", "npm run dev -- --host"]


