# ប្រើ Node.js version 18 (ឬខ្ពស់ជាងនេះ)
FROM node:18-slim

# កំណត់ Folder ធ្វើការ
WORKDIR /app

# ចម្លង package.json និង package-lock.json
COPY package*.json ./

# ដំឡើង dependencies
RUN npm install --production

# ចម្លងកូដទាំងអស់ចូលទៅក្នុង Container
COPY . .

# កំណត់ Port ដែល Server ដំណើរការ
EXPOSE 8080

# Command សម្រាប់ចាប់ផ្តើម Server
CMD ["node", "server.js"]