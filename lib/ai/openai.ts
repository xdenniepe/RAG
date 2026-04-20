import { OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";

const DEFAULT_CHAT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const DEFAULT_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getOpenAIClient() {
  return new OpenAI({
    apiKey: requireEnv("OPENAI_API_KEY"),
  });
}

export function getChatModel() {
  return DEFAULT_CHAT_MODEL;
}

export function getEmbeddingModel() {
  return DEFAULT_EMBEDDING_MODEL;
}

export function getEmbeddingsClient() {
  return new OpenAIEmbeddings({
    apiKey: requireEnv("OPENAI_API_KEY"),
    model: DEFAULT_EMBEDDING_MODEL,
  });
}

export async function withOpenAIRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
) {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 400));
      attempt += 1;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI operation failed after retries");
}

export async function extractTextFromImageWithOpenAI(file: File) {
  const client = getOpenAIClient();
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = file.type || "image/png";

  const response = await withOpenAIRetry(() =>
    client.responses.create({
      model: DEFAULT_CHAT_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extract all readable text from this file. Keep line breaks simple. Return only extracted text.",
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64}`,
              detail: "auto",
            },
          ],
        },
      ],
    }),
  );

  return response.output_text.trim();
}

/*
Anthropic fallback scaffold (not active yet):

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
*/
