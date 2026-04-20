import { getEmbeddingsClient } from "@/lib/ai/openai";
import { assembleContextPackage } from "@/lib/retrieval/assemble-context";
import { expandQuery } from "@/lib/retrieval/query-expansion";
import {
  RETRIEVAL_VERSION,
  RetrievedChunk,
  retrieveAdminChunks,
} from "@/lib/retrieval/retrieve-admin";
import { retrieveMerchantChunks } from "@/lib/retrieval/retrieve-merchant";

type SourceType = "ops" | "restaurant";

export type { RetrievedChunk } from "@/lib/retrieval/retrieve-admin";

export const RETRIEVAL_DEFAULTS = {
  minSimilarity: 0.2,
  mmrLambda: 0.7,
};

export type RetrievedContextBundle = {
  retrievalVersion: string;
  query: string;
  rewrittenQuery: string;
  opsChunks: RetrievedChunk[];
  merchantChunks: RetrievedChunk[];
  chunks: RetrievedChunk[];
  structured: Awaited<ReturnType<typeof assembleContextPackage>>["structured"];
};

export async function retrieveContext(params: {
  merchantId: string;
  sourceTypes: SourceType[];
  query: string;
  topK?: number;
}): Promise<RetrievedContextBundle> {
  const rewrittenQuery = await expandQuery(params.query);
  const embeddings = getEmbeddingsClient();
  const vector = await embeddings.embedQuery(rewrittenQuery);
  const topK = params.topK ?? 8;

  const [opsChunks, merchantChunks] = await Promise.all([
    params.sourceTypes.includes("ops")
      ? retrieveAdminChunks({
          merchantId: params.merchantId,
          vector,
          topK,
          minSimilarity: RETRIEVAL_DEFAULTS.minSimilarity,
          mmrLambda: RETRIEVAL_DEFAULTS.mmrLambda,
        })
      : Promise.resolve([] as RetrievedChunk[]),
    params.sourceTypes.includes("restaurant")
      ? retrieveMerchantChunks({
          merchantId: params.merchantId,
          vector,
          topK,
          minSimilarity: RETRIEVAL_DEFAULTS.minSimilarity,
          mmrLambda: RETRIEVAL_DEFAULTS.mmrLambda,
        })
      : Promise.resolve([] as RetrievedChunk[]),
  ]);

  const contextPackage = await assembleContextPackage({
    merchantId: params.merchantId,
    opsChunks,
    merchantChunks,
  });

  return {
    retrievalVersion: RETRIEVAL_VERSION,
    query: params.query,
    rewrittenQuery,
    opsChunks,
    merchantChunks,
    chunks: [...opsChunks, ...merchantChunks]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK),
    structured: contextPackage.structured,
  };
}
