import { Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import { ThreadMessagesPage } from "openai/resources/beta/threads/messages/messages";
import { Run } from "openai/resources/beta/threads/runs/runs";
import pRetry, { AbortError } from "p-retry";

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
    handler: (req, reply) => handleChat(server, req, reply),
  });
};

interface OpenAiRequest extends FastifyRequest {
  body: {
    prompt: string;
  };
}

async function handleChat(
  server: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    if (!server.geist || !server.openai || !server.thread) {
      server.log.error("Invalid openAi configuration");
      return;
    }

    // Can you explain Hegel's conception of ontology?
    await server.openai.beta.threads.messages.create(server.thread.id, {
      role: "user",
      content: "Can you explain Hegel's conception of the dialectic?",
    });

    const run = await server.openai.beta.threads.runs.create(server.thread.id, {
      assistant_id: server.geist.id,
      instructions:
        "You are an assistant who has memorized all of Hegel's 'The Phenomenology of Spirit' and can answer any question pertaining to it. ",
    });

    const result = await pRetry(() => getMessage(server, run), { retries: 5 });

    if (!result) {
      throw Error("fuck");
    }

    console.log("fuck");
    // const l = result.messages as ThreadMessagesPage;
    const threadMessages = await server.openai.beta.threads.messages.list(
      server.thread.id
    );

    threadMessages.data.forEach((message) => {
      console.log(message.content);
    });

    //  return { response: "" };
  } catch (err) {
    server.log.error("Plugin: OpenAi, error on register", err);
    console.log(err);
  }
}

const getMessage = async (server: FastifyInstance, run: Run) => {
  if (!server.geist || !server.openai || !server.thread) {
    server.log.error("Invalid openAi configuration");
    return;
  }
  const retrievedRun = await server.openai.beta.threads.runs.retrieve(
    server.thread.id,
    run.id
  );
  if (retrievedRun.status === "completed") {
    const messagesFromThread = await server.openai.beta.threads.messages.list(
      server.thread.id
    );
    return Promise.resolve({
      runResult: retrievedRun,
      messages: messagesFromThread,
    });
  } else {
    throw new Error("error");
  }
};
