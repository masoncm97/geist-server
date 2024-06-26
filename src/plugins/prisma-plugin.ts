import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { PrismaClient } from "../../prisma/generated/client";

const prismaClient: FastifyPluginAsync = fp(async (server, options) => {
  if (process.env["POSTGRES_URL"]) {
    const prisma = new PrismaClient();

    await prisma.$connect();

    // Make Prisma Client available through the fastify server instance: server.prisma
    server.decorate("prisma", prisma);

    server.addHook("onClose", async (server) => {
      await server.prisma.$disconnect();
    });
  } else {
    server.log.info(
      "Please provide a 'POSTGRES_URL' if you'd like to use a db"
    );
  }
});

export default prismaClient;
