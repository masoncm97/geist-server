import { Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import { Message, OpenAiRequest } from "../../../types/fastify";
import { promptChatbot } from "../../helper/openai";
import { parseString } from "../../helper/utility";
import { schedule } from "node-cron";

export const conversationRoutes: FastifyPluginAsync = async (
  server: FastifyInstance
) => {
  server.post("/start-conversation", {
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
    handler: (request, reply) =>
      handleStartConversation(server, request, reply),
  });
  server.post("/stop-conversation", {
    schema: {
      response: {
        200: Type.Object({
          response: Type.String(),
        }),
      },
    },
    handler: (request, reply) => handleStopConversation(server, request, reply),
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

async function handleStartConversation(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!server.openai || !server.thread) {
      server.log.error("Invalid openAi configuration");
      return;
    }
    if (server.conversationTask) {
      return reply.send({
        error: "Conversation process is already active.",
      });
    }

    const { prompt } = request.body as OpenAiRequest["body"];

    const initMessage = await promptChatbot(
      server,
      prompt,
      server.interlocutors.i1.id
    );

    const initResponse = await promptChatbot(
      server,
      initMessage,
      server.interlocutors.i2.id
    );

    await server.prisma.conversation.create({
      data: {
        prompt: initMessage,
        response: initResponse,
      },
    });

    const task = schedule("0 8-20 * * *", () => {
      processConversation(server, reply);
    });

    server.conversationTask = task;

    return { response: initMessage };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function handleStopConversation(
  server: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!server.openai || !server.thread) {
      server.log.error("Invalid openAi configuration");
      return;
    }
    if (!server.conversationTask) {
      return reply.status(500).send({ error: "Internal Server Error" });
    }
    server.conversationTask.stop();
    server.taskIsActive = false;
    server.conversationTask = null;
    return {
      response: "Conversation process stopped successfully.",
    };
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  }
}

async function processConversation(
  server: FastifyInstance,
  reply: FastifyReply
) {
  if (server.taskIsActive) {
    server.log.warn(
      "Cannot start a new task before the previous one is finished."
    );
    return;
  }
  server.taskIsActive = true;

  try {
    const previousConversation = await server.prisma.conversation.findFirst({
      orderBy: {
        id: "desc",
      },
    });

    server.log.info("Processing new conversation");

    // Add custom error here
    if (!previousConversation) {
      server.log.error("No active conversations");
      reply.status(500).send({ error: "Internal Server Error" });
    }

    const message = await promptChatbot(
      server,
      previousConversation.response,
      server.interlocutors.i1.id
    );

    const response = await promptChatbot(
      server,
      message,
      server.interlocutors.i2.id
    );

    await server.prisma.conversation.create({
      data: {
        prompt: message,
        response: response,
      },
    });
  } catch (err) {
    server.log.error(err.message);
    reply.status(500).send({ error: "Internal Server Error" });
  } finally {
    server.taskIsActive = false;
  }
}
