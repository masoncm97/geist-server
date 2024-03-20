import { FastifyInstance } from "fastify";
import { OpenAI } from "openai";
import { Assistant } from "openai/resources/beta/assistants/assistants";
import { Thread } from "openai/resources/beta/threads/threads";
import "dotenv/config";
import { getAssistant } from "../helper/openai";

export async function registerOpenAi(server: FastifyInstance) {
  try {
    const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

    const [hegel, sartre] = await Promise.all([
      getAssistant(server, process.env["HEGEL"]),
      getAssistant(server, process.env["SARTRE"]),
    ]);

    const thread = (await openai.beta.threads.create()) as Thread;

    server.decorate("interlocutors", { i1: hegel, i2: sartre });
    server.decorate("openai", openai);
    server.decorate("thread", thread);
    server.log.info("Successfully registered OpenAi Plugin");
  } catch (err) {
    server.log.error("Plugin: OpenAi, error on register", err);
    console.log(err);
  }
}
