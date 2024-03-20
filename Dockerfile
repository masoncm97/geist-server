FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY ./prisma prisma
COPY ./src src

RUN npm install -g pnpm
RUN pnpm install 

COPY . .
CMD ["pnpm", "run", "start"]

