import { FastifyInstance } from "fastify";
import { OpenAI } from "openai";
import { Thread } from "openai/resources/beta/threads/threads";
import "dotenv/config";
import { getAssistant } from "../helper/openai";

// Import the AssistantResponse type from the helper
interface AssistantResponse {
  id: string;
  object: string;
  created_at: number;
  name: string;
  description: string | null;
  model: string;
  instructions: string;
  tools: Array<{
    type: string;
    file_search?: {};
  }>;
  top_p: number;
  temperature: number;
  reasoning_effort: string | null;
  tool_resources: {
    file_search: {
      vector_store_ids: string[];
    };
  };
  metadata: Record<string, any>;
  response_format: string;
}

export async function registerOpenAi(server: FastifyInstance) {
  try {
    const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

    const [hegel, sartre]: [AssistantResponse, AssistantResponse] = await Promise.all([
      getAssistant(server, process.env["HEGEL"]),
      getAssistant(server, process.env["SARTRE"]),
    ]);



    const thread = (await openai.beta.threads.create()) as Thread;


    server.decorate("interlocutors", { i1: hegel, i2: sartre });
    server.decorate("openai", openai);
    server.decorate("thread", thread);
    server.log.info("Successfully registered OpenAi Plugin");
    server.log.info("Hegel assistant details:", { id: hegel?.id, name: hegel?.name, instructions: hegel?.instructions?.substring(0, 100) + "..." });
    server.log.info("Sartre assistant details:", { id: sartre?.id, name: sartre?.name, instructions: sartre?.instructions?.substring(0, 100) + "..." });
  } catch (err) {
    server.log.error("Plugin: OpenAi, error on register", err);
    console.log(err);
  }
}
