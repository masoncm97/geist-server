import { Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import {
  Message,
  OpenAiRequest,
  PaginateRequest,
} from "../../../types/fastify";
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
        200: getMultipleSchema,
      },
    },
    handler: (_, reply) => handleGetChat(server, reply),
  });
  server.get("/latest-chat", {
    schema: {
      response: {
        200: getSingleSchema,
      },
    },
    handler: (_, reply) => handleGetLatestChat(server, reply),
  });
  server.post("/paginate-chat", {
    schema: {
      request: {
        body: Type.Object({
          cursor: Type.String(),
        }),
      },
      response: {
        200: getMultipleSchema,
      },
    },
    handler: (request, reply) => handleGetPaginateChat(server, request, reply),
  });
  server.delete("/chat/:id", {
    handler: (request, reply) => handleDeleteChat(server, request, reply),
  });
  server.delete("/after-chat/:id", {
    handler: (request, reply) => handleDeleteAfterId(server, request, reply),
  });
  server.delete("/chat", {
    handler: (_, reply) => handleDeleteAllChats(server, reply),
  });
};

const getMultipleSchema = {
  type: "object",
  properties: {
    messages: {
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
  required: ["messages"],
};

const getSingleSchema = {
  type: "object",
  properties: {
    id: { type: "number" },
    prompt: { type: "string" },
    response: { type: "string" },
  },
  required: ["id", "prompt", "response"],
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
    const messages: Message[] = await server.prisma.conversation.findMany();

    return { messages: messages };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function handleGetPaginateChat(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!server.prisma) {
      server.log.error("Invalid prisma configuration");
      return;
    }

    const { cursor } = request.body as PaginateRequest["body"];

    const messages: Message[] = await server.prisma.conversation.findMany({
      orderBy: {
        id: "asc",
      },
      cursor: {
        id: cursor,
      },
      take: -10,
    });

    return { messages: messages };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function handleGetLatestChat(
  server: FastifyInstance,
  reply: FastifyReply
) {
  try {
    if (!server.prisma) {
      server.log.error("Invalid prisma configuration");
      return;
    }
    const latestMessage: Message[] = await server.prisma.conversation.findMany({
      orderBy: {
        id: "desc",
      },
      take: 1,
    });

    if (latestMessage.length > 0) {
      return latestMessage[0];
    } else {
      server.log.error("Latest message is unavailable");
    }
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

async function handleDeleteAfterId(
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

    await server.prisma.conversation.deleteMany({
      where: {
        id: {
          gte: parsedId,
        },
      },
    });

    return { response: `Succesfully deleted Chat Conversation` };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function handleDeleteAllChats(
  server: FastifyInstance,
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
