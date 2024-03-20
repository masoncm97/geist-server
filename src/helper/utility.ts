import { FastifyReply } from "fastify";
import { Assistant } from "openai/resources/beta/assistants/assistants";

export function findAssistantById(
  interlocutors: { [key: string]: Assistant },
  searchId: string
): Assistant | undefined {
  return Object.values(interlocutors).find(
    (assistant) => assistant.id === searchId
  );
}

export const removeLenticularBrackets = (input: string): string => {
  const regex = /【.*?†.*?】/g;
  return input.replace(regex, "");
};

export const parseString = (input: string, reply: FastifyReply): number => {
  const parsed = parseInt(input, 10);

  if (isNaN(parsed)) {
    reply.status(400).send({ error: "Invalid ID format" });
    return;
  }

  return parsed;
};
