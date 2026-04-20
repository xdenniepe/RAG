import { getSupabaseAdminClient } from "@/lib/supabase/server";

type InsertChunkInput = {
  documentId: string;
  merchantId: string;
  sourceType: "ops" | "restaurant";
  sectionId?: string | null;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: Record<string, string | number>;
  embedding: number[];
  chunkingVersion?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  sectionTitle?: string | null;
  pageNumber?: number | null;
};

export async function insertDocumentChunk(input: InsertChunkInput) {
  const supabase = getSupabaseAdminClient();
  const embeddingText = `[${input.embedding.join(",")}]`;

  const v2 = await supabase.rpc("insert_document_chunk_v2", {
    p_document_id: input.documentId,
    p_merchant_id: input.merchantId,
    p_source_type: input.sourceType,
    p_section_id: input.sectionId ?? null,
    p_content: input.content,
    p_chunk_index: input.chunkIndex,
    p_token_count: input.tokenCount,
    p_metadata: input.metadata,
    p_embedding_text: embeddingText,
    p_chunking_version: input.chunkingVersion ?? null,
    p_embedding_model: input.embeddingModel ?? null,
    p_embedding_dimensions: input.embeddingDimensions ?? null,
    p_section_title: input.sectionTitle ?? null,
    p_page_number: input.pageNumber ?? null,
  });

  if (!v2.error) {
    return v2.data as string;
  }

  const legacy = await supabase.rpc("insert_document_chunk", {
    p_document_id: input.documentId,
    p_merchant_id: input.merchantId,
    p_source_type: input.sourceType,
    p_content: input.content,
    p_chunk_index: input.chunkIndex,
    p_token_count: input.tokenCount,
    p_metadata: input.metadata,
    p_embedding_text: embeddingText,
  });

  if (legacy.error) {
    throw new Error(
      `Failed to insert chunk: ${v2.error.message}; legacy fallback also failed: ${legacy.error.message}`,
    );
  }
  return legacy.data as string;
}

export async function matchDocumentChunks(params: {
  merchantId: string;
  sourceTypes: Array<"ops" | "restaurant">;
  embedding: number[];
  limit: number;
}) {
  const supabase = getSupabaseAdminClient();
  const embeddingText = `[${params.embedding.join(",")}]`;

  const v2 = await supabase.rpc("match_document_chunks_v2", {
    p_query_embedding_text: embeddingText,
    p_match_count: params.limit,
    p_merchant_id: params.merchantId,
    p_source_types: params.sourceTypes,
  });

  if (!v2.error) {
    return (v2.data ?? []) as Array<{
      id: string;
      document_id: string;
      file_name: string;
      source_type: "ops" | "restaurant";
      content: string;
      metadata: Record<string, string | number>;
      section_title?: string | null;
      page_number?: number | null;
      similarity: number;
    }>;
  }

  const { data, error } = await supabase.rpc("match_document_chunks", {
    p_query_embedding_text: embeddingText,
    p_match_count: params.limit,
    p_merchant_id: params.merchantId,
    p_source_types: params.sourceTypes,
  });

  if (error) {
    throw new Error(
      `Failed to retrieve chunks: ${v2.error.message}; legacy fallback also failed: ${error.message}`,
    );
  }

  return (data ?? []) as Array<{
    id: string;
    document_id: string;
    file_name: string;
    source_type: "ops" | "restaurant";
    content: string;
    metadata: Record<string, string | number>;
    section_title?: string | null;
    page_number?: number | null;
    similarity: number;
  }>;
}
