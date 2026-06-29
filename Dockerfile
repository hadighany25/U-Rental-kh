# syntax = docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

# ដំណាក់កាល Build ដើម្បីដំឡើង C++ Compiler និង Python (នេះជាអ្នកដោះស្រាយបញ្ហា Database)
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY package*.json ./
# ប្រើ npm install ធម្មតាដើម្បីការពារកុំឱ្យ Error បើអត់មានឯកសារ package-lock.json
RUN npm install --production

COPY . .

# ដំណាក់កាលចុងក្រោយ
FROM base
COPY --from=build /app /app

# កំណត់ Port ទៅ 8080 វិញ ឱ្យស៊ីគ្នាជាមួយ fly.toml និង server.js របស់អ្នក
EXPOSE 8080

# បញ្ជាឱ្យរត់ server.js ដោយផ្ទាល់
CMD [ "node", "server.js" ]