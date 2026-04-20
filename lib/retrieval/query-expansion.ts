import { getChatModel, getOpenAIClient, withOpenAIRetry } from "@/lib/ai/openai";

export async function expandQuery(query: string) {
  const openai = getOpenAIClient();
  const response = await withOpenAIRetry(() =>
    openai.responses.create({
      model: getChatModel(),
      input: [
        {
          role: "system",
          content:
            "Rewrite the user query into one concise retrieval query focused on wine menu marketing language and restaurant context. Return only one line.",
        },
        {
          role: "user",
          content: query,
        },
      ],
    }),
  );

  return response.output_text.trim() || query;
}
