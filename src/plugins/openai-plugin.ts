import { FastifyInstance } from "fastify";
import { OpenAI } from "openai";
import { Assistant } from "openai/resources/beta/assistants/assistants";
import "dotenv/config";
import { Thread } from "openai/resources/beta/threads/threads";

export async function registerOpenAi(server: FastifyInstance) {
  try {
    const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
    const geist = (await openai.beta.assistants.create({
      name: "Geist",
      instructions:
        "You are an assistant who has read and memorized all of Hegel's 'The Phenomenology of Spirit' and can answer any question pertaining to it.",
      tools: [{ type: "retrieval" }],
      file_ids: ["file-SJU3WkZ9yPPuWY1dZyJxgzLg"],
      model: "gpt-3.5-turbo-0125",
    })) as Assistant;
    const thread = (await openai.beta.threads.create()) as Thread;

    server.decorate("geist", geist);
    server.decorate("openai", openai);
    server.decorate("thread", thread);
    server.log.info("Successfully registered OpenAi Plugin");
  } catch (err) {
    server.log.error("Plugin: OpenAi, error on register", err);
    console.log(err);
  }
}

declare module "fastify" {
  interface FastifyInstance {
    geist?: Assistant;
    openai?: OpenAI;
    thread?: Thread;
  }
}
