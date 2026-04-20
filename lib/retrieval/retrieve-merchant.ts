import { rerankWithMMR } from "@/lib/retrieval/mmr";
import { matchDocumentChunks } from "@/lib/supabase/vector";

import { RetrievedChunk } from "@/lib/retrieval/retrieve-admin";

export async function retrieveMerchantChunks(params: {
  merchantId: string;
  vector: number[];
  topK: number;
  minSimilarity: number;
  mmrLambda?: number;
}) {
  const rawMatches = await matchDocumentChunks({
    merchantId: params.merchantId,
    sourceTypes: ["restaurant"],
    embedding: params.vector,
    limit: Math.max(params.topK * 2, 8),
  });

  const filtered = rawMatches.filter((match) => match.similarity >= params.minSimilarity);
  const reranked = rerankWithMMR(
    filtered.map((item) => ({
      id: item.id,
      content: item.content,
      similarity: item.similarity,
    })),
    params.topK,
    params.mmrLambda,
  );
  const byId = new Map(filtered.map((item) => [item.id, item]));

  return reranked
    .map((choice) => byId.get(choice.id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, params.topK)
    .map(
      (item): RetrievedChunk => ({
        id: item.id,
        documentId: item.document_id,
        fileName: item.file_name,
        sourceType: "restaurant",
        content: item.content,
        score: item.similarity,
        sectionTitle: item.section_title ?? null,
        pageNumber: item.page_number ?? null,
        metadata: item.metadata,
      }),
    );
}
