import Fastify from "fastify";
import { chatRoutes } from "./routes/chat/chat-routes";
import { registerOpenAi } from "./plugins/openai-plugin";
import config from "./plugins/config";
import cors from "@fastify/cors";
import prismaClient from "./plugins/prisma-plugin";
import { conversationRoutes } from "./routes/conversation/conversation-routes";

/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */

const createServer = async () => {
  const server = Fastify({
    logger: true,
  });

  await server.register(config);
  await server.register(cors, { origin: "*" });
  await server.register(prismaClient);
  await registerOpenAi(server);

  server.register(chatRoutes);
  server.register(conversationRoutes);

  return server;
};

export default createServer;
