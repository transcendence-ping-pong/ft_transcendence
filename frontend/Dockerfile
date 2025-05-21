FROM node:18

WORKDIR /app

# copy package.json and package-lock.json first(?)
COPY package.json package-lock.json ./

# install dependencies
RUN npm install

# copy source code
COPY . .

# compile files only inside the container... unless using volumes/copy to export them
# I added volumes, so I can perform hot reloads... however, this implies having to compile...
# tailwindcss and typescript files before serving the app
# TODO: how to avoid this? and keep the hot reload?

# build Tailwind CSS (output.css) before serving or building the app
RUN npx tailwindcss -i ./src/styles/tailwind.css -o ./src/styles/output.css

# build TypeScript files (compile .ts to .js)
RUN npx tsc

RUN npm run build

# serve static files (?) TODO: check best approach
RUN npm install -g serve
CMD ["serve", "src"]
