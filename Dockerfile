FROM node:18-slim
WORKDIR /app

# Install OpenSSL and other required dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY ./prisma prisma
COPY ./src src

RUN npm install -g pnpm
RUN pnpm install 

COPY . .
CMD ["pnpm", "run", "start"]

