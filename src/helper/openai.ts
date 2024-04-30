import { FastifyInstance } from "fastify";
import { MessageContentText } from "openai/resources/beta/threads/messages/messages";
import { Run } from "openai/resources/beta/threads/runs/runs";
import pRetry from "p-retry";
import { Assistant } from "openai/resources/beta/assistants/assistants";
import { findAssistantById, removeLenticularBrackets } from "./utility";
import axios from "axios";

export const promptChatbot = async (
  server: FastifyInstance,
  prompt: string,
  id: string
): Promise<string> => {
  const engineeredPrompt =
    prompt +
    "Answer my question to the best of your ability, and please focus on providing valuable insight into the nature of consciousness. Then, ask me a follow-up question that investigates the nature of consciousness through the context of the response that you've provided. Please only ask a follow up question once you're answered my original question.";

  const assistant = findAssistantById(server.interlocutors, id);

  const response = await sendMessage(
    server,
    engineeredPrompt,
    findAssistantById(server.interlocutors, id)
  );

  server.log.info(`Assistant ${assistant.name} responded to a prompt`);

  return response;
};

export const sendMessage = async (
  server: FastifyInstance,
  prompt: string,
  assistant: Assistant
): Promise<string> => {
  await server.openai.beta.threads.messages.create(server.thread.id, {
    role: "user",
    content: prompt,
  });

  const run = await server.openai.beta.threads.runs.create(server.thread.id, {
    assistant_id: assistant.id,
    instructions: assistant.instructions,
  });

  const result = await pRetry(() => getResponse(server, run), {
    retries: 10,
  });

  if (!result) {
    throw Error("fuck");
  }

  const threadMessages = await server.openai.beta.threads.messages.list(
    server.thread.id
  );

  const answer = threadMessages.data[0].content[0] as MessageContentText;
  const response = removeLenticularBrackets(answer.text.value);

  return response;
};

export const getResponse = async (server: FastifyInstance, run: Run) => {
  if (!server.openai || !server.thread) {
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

export async function getAssistant(
  server: FastifyInstance,
  assistantId: string
): Promise<Assistant> {
  try {
    const response = await axios.get(
      `https://api.openai.com/v1/assistants/${assistantId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env["OPENAI_API_KEY"]}`,
          "OpenAI-Beta": "assistants=v1",
        },
      }
    );

    return response.data;
  } catch (err) {
    server.log.error(err.message);
  }
}
