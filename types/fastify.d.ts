import OpenAI from "openai";
import { Assistant } from "openai/resources/beta/assistants/assistants";
import { Thread } from "openai/resources/beta/threads/threads";
import { PrismaClient } from "../prisma/generated/client";
import { ScheduledTask } from "node-cron";

declare module "fastify" {
  interface FastifyInstance {
    // geist?: Assistant;
    interlocutors?: { i1: Assistant; i2: Assistant };
    openai?: OpenAI;
    thread?: Thread;
    prisma: PrismaClient;
    conversationIsActive: boolean;
    taskIsActive: boolean;
    conversationTask: ScheduledTask | null;
  }
}

interface Message {
  id: number;
  prompt: string;
  response: string;
}

interface OpenAiRequest extends FastifyRequest {
  body: {
    prompt: string;
  };
}

interface PaginateRequest extends FastifyRequest {
  body: {
    cursor: number;
  };
}

interface Chatbot {
  bot: Assistant;
  id: string;
  instructions: string;
}
