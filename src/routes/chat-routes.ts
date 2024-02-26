import { Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import { MessageContentText } from "openai/resources/beta/threads/messages/messages";
import { Run } from "openai/resources/beta/threads/runs/runs";
import pRetry from "p-retry";

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

    const { prompt } = req.body as OpenAiRequest["body"];
    console.log(prompt);

    await server.openai.beta.threads.messages.create(server.thread.id, {
      role: "user",
      content: prompt,
    });

    const run = await server.openai.beta.threads.runs.create(server.thread.id, {
      assistant_id: server.geist.id,
      instructions:
        "You're name is Geist. You are an assistant who has memorized all of Hegel's 'The Phenomenology of Spirit' and can answer any question pertaining to it.",
    });

    const result = await pRetry(() => getMessage(server, run), { retries: 10 });

    if (!result) {
      throw Error("fuck");
    }
    const threadMessages = await server.openai.beta.threads.messages.list(
      server.thread.id
    );

    const answer = threadMessages.data[0].content[0] as MessageContentText;

    console.log(answer.text.value);
    return { response: answer.text.value };
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
