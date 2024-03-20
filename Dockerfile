FROM node:18-alpine
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY ./prisma prisma
COPY ./src src

RUN npm install -g pnpm
RUN pnpm install 

COPY . .
# EXPOSE 8080
CMD ["pnpm", "run", "start"]

