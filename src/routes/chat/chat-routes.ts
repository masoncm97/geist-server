import { Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import { Message, OpenAiRequest } from "../../../types/fastify";
import { promptChatbot } from "../../helper/openai";
import { parseString } from "../../helper/utility";

export const chatRoutes: FastifyPluginAsync = async (
  server: FastifyInstance
) => {
  server.post("/chat", {
    schema: {
      request: {
        body: Type.Object({
          prompt: Type.String(),
        }),
      },
      response: {
        200: Type.Object({
          response: Type.String(),
        }),
      },
    },
    handler: (request, reply) => handleChat(server, request, reply),
  });
  server.get("/chat", {
    schema: {
      response: {
        200: getAllSchema,
      },
    },
    handler: (_, reply) => handleGetChat(server, reply),
  });
  server.delete("/chat/:id", {
    handler: (request, reply) => handleDeleteChat(server, request, reply),
  });
  server.delete("/chat", {
    handler: (request, reply) => handleDeleteAllChats(server, request, reply),
  });
};

const getAllSchema = {
  type: "object",
  properties: {
    previousMessages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "number" },
          prompt: { type: "string" },
          response: { type: "string" },
        },
        required: ["id", "prompt", "response"],
      },
    },
  },
  required: ["previousMessages"],
};

async function handleChat(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!server.openai || !server.thread) {
      server.log.error("Invalid openAi configuration");
      return;
    }

    const { prompt } = request.body as OpenAiRequest["body"];

    const response = await promptChatbot(
      server,
      prompt,
      server.interlocutors.i1.id
    );

    await server.prisma.conversation.create({
      data: {
        prompt,
        response,
      },
    });

    return { response: response };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function handleGetChat(server: FastifyInstance, reply: FastifyReply) {
  try {
    if (!server.prisma) {
      server.log.error("Invalid prisma configuration");
      return;
    }
    const previousMessages: Message[] =
      await server.prisma.conversation.findMany();

    return { previousMessages: previousMessages };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function handleDeleteChat(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!server.prisma) {
      server.log.error("Invalid prisma configuration");
      return;
    }

    const { id } = request.params as { id: string };

    const parsedId = parseString(id, reply);

    await server.prisma.conversation.delete({
      where: {
        id: parsedId,
      },
    });

    return { response: `Succesfully deleted ID: ${id}` };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function handleDeleteAllChats(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!server.prisma) {
      server.log.error("Invalid prisma configuration");
      return;
    }

    await server.prisma.conversation.deleteMany({});

    return { response: `Succesfully deleted Chat Conversation` };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}
