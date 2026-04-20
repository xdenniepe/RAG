import { extractTextFromImageWithOpenAI } from "@/lib/ai/openai";

function cleanText(text: string) {
  return text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function parseImageFile(file: File) {
  return cleanText(await extractTextFromImageWithOpenAI(file));
}
