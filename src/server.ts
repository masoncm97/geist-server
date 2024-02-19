import Fastify from "fastify";
import { chatRoutes } from "./routes/chat-routes";
import { registerOpenAi } from "./plugins/openai-plugin";
import config from "./plugins/config";
import * as dotenv from "dotenv";

/**
 * @type {import('fastify').FastifyInstance} Instance of Fastify
 */

const createServer = async () => {
  const server = Fastify({
    logger: true,
  });

  await server.register(config);
  await registerOpenAi(server);

  server.register(chatRoutes);

  return server;
};

export default createServer;
