import type { RetrievedContextBundle } from "@/lib/retrieval/retrieve-context";

function chunksToText(label: string, chunks: RetrievedContextBundle["chunks"]) {
  if (!chunks.length) return `${label}: none`;
  return `${label}:\n${chunks
    .map(
      (chunk, index) =>
        `${index + 1}. ${chunk.fileName} (${chunk.sourceType}) score=${chunk.score.toFixed(3)}\n${chunk.content}`,
    )
    .join("\n\n")}`;
}

export function buildStructuredDraftPrompt(params: {
  brief: string;
  context: RetrievedContextBundle;
}) {
  const structured = params.context.structured;
  const structuredJson = JSON.stringify(structured, null, 2);

  return `
You are generating a structured draft for wine marketing copy.

Rules:
- Only use information grounded in the provided context.
- Do not invent awards, tasting notes, producers, or claims.
- Favor concise, actionable language.
- Apply the merchant brand tone from merchant profile and merchant chunks.
- Include visual and component guidance so a generated customer-facing page can be assembled.
- Return valid JSON only.

User brief:
${params.brief}

${chunksToText("Ops chunks", params.context.opsChunks)}

${chunksToText("Merchant chunks", params.context.merchantChunks)}

Structured entities:
${structuredJson}

JSON shape:
{
  "restaurantSummary": "string",
  "toneSummary": "string",
  "copyDirection": "string",
  "visualDirection": "string",
  "wines": [
    {
      "wineName": "string",
      "relevantWineFacts": ["string"],
      "dishFacts": ["string"],
      "pairingRationale": "string",
      "approvedClaimsUsed": ["string"],
      "groundedSources": ["filename-or-chunk-id"],
      "imageDirection": "string"
    }
  ],
  "featuredPromoDirection": "string",
  "componentPlan": [
    {
      "component": "string",
      "purpose": "string"
    }
  ]
}
`.trim();
}
