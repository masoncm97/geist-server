import { FastifyInstance } from "fastify";

const create = async (
  server: FastifyInstance,
  data: { prompt: string; response: string }
) => {
  await server.prisma.conversation.create({
    data,
  });
};
