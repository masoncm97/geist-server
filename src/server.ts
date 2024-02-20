import Fastify from "fastify";
import { chatRoutes } from "./routes/chat-routes";
import { registerOpenAi } from "./plugins/openai-plugin";
import config from "./plugins/config";
import cors from "@fastify/cors";

/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */

const createServer = async () => {
  const server = Fastify({
    logger: true,
  });

  await server.register(config);
  await server.register(cors, { origin: "*" });
  await registerOpenAi(server);

  server.register(chatRoutes);

  return server;
};

export default createServer;
