import crypto from "node:crypto";

import { getEmbeddingModel, getEmbeddingsClient } from "@/lib/ai/openai";
import { CHUNKING_VERSION, chunkParsedFile } from "@/lib/ingestion/chunker";
import { extractStructuredData } from "@/lib/ingestion/extract-structured-data";
import { parseFileToText } from "@/lib/ingestion/extract-text";
import { NORMALIZATION_VERSION, normalizeExtractionBlocks } from "@/lib/ingestion/normalize";
import { IngestionInput, SOURCE_TYPES, StructuredExtractionResult } from "@/lib/ingestion/types";
import { WineImportRow } from "@/lib/ops-import/schema";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { insertDocumentChunk } from "@/lib/supabase/vector";

type DocumentInsertPayload = {
  merchant_id: string;
  source_type: "ops" | "restaurant";
  file_name: string;
  mime_type: string;
  checksum: string;
  file_size: number;
  status: string;
  visibility_scope: string;
  normalization_version: string;
  chunking_version: string;
  embedding_model: string;
  embedding_dimensions: number;
  metadata: Record<string, string | number>;
};

function assertIngestionInput(input: IngestionInput) {
  if (!input.merchantId.trim()) {
    throw new Error("merchantId is required");
  }
  if (!SOURCE_TYPES.includes(input.sourceType)) {
    throw new Error("sourceType must be ops or restaurant");
  }
  if (!input.files.length) {
    throw new Error("At least one file is required");
  }
}

async function insertDocumentWithFallback(
  payload: DocumentInsertPayload,
): Promise<{ id: string }> {
  const supabase = getSupabaseAdminClient();

  const attempts: Array<{
    name: string;
    data: Partial<DocumentInsertPayload>;
  }> = [
    { name: "full", data: payload },
    {
      name: "without_metadata",
      data: {
        merchant_id: payload.merchant_id,
        source_type: payload.source_type,
        file_name: payload.file_name,
        mime_type: payload.mime_type,
        checksum: payload.checksum,
        file_size: payload.file_size,
      },
    },
    {
      name: "without_checksum_metadata",
      data: {
        merchant_id: payload.merchant_id,
        source_type: payload.source_type,
        file_name: payload.file_name,
        mime_type: payload.mime_type,
      },
    },
  ];

  let lastError:
    | {
        code?: string;
        message?: string;
        details?: string;
      }
    | undefined;

  for (const attempt of attempts) {
    const { data: document, error } = await supabase
      .from("documents")
      .insert(attempt.data)
      .select("id")
      .single();

    if (!error && document?.id) {
      return { id: document.id };
    }

    lastError = error ?? {
      code: "UNKNOWN",
      message: `Insert failed on ${attempt.name} attempt`,
    };

    // If the table is missing, no fallback attempt can fix it.
    if (error?.code === "42P01") {
      break;
    }
    // If the role is forbidden, fallback won't help.
    if (error?.code === "42501") {
      break;
    }
  }

  const message = lastError?.message ?? "Unknown documents insert error";
  const code = lastError?.code ? ` (${lastError.code})` : "";
  const details = lastError?.details ? ` - ${lastError.details}` : "";
  throw new Error(`${message}${code}${details}`);
}

function isOptionalSchemaError(code?: string) {
  return code === "42P01" || code === "42703" || code === "42883";
}

async function insertOptionalRows(params: {
  table: string;
  rows: Array<Record<string, unknown>>;
}) {
  if (!params.rows.length) return;
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(params.table).insert(params.rows);
  if (error && !isOptionalSchemaError(error.code)) {
    throw new Error(`Failed writing ${params.table}: ${error.message}`);
  }
}

async function persistStructuredData(params: {
  merchantId: string;
  documentId: string;
  extracted: StructuredExtractionResult;
}) {
  const { extracted, merchantId, documentId } = params;
  const now = new Date().toISOString();

  if (extracted.restaurantProfile) {
    const supabase = getSupabaseAdminClient();
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("restaurant_profiles")
      .select("metadata")
      .eq("merchant_id", merchantId)
      .maybeSingle();
    if (existingProfileError && !isOptionalSchemaError(existingProfileError.code)) {
      throw new Error(`Failed loading restaurant_profiles metadata: ${existingProfileError.message}`);
    }

    const mergedMetadata = {
      ...((existingProfile?.metadata as Record<string, unknown> | null) ?? {}),
      brandStory: extracted.restaurantProfile.brandStory ?? null,
      targetAudience: extracted.restaurantProfile.targetAudience ?? null,
      pricePositioning: extracted.restaurantProfile.pricePositioning ?? null,
    };

    const { error } = await supabase.from("restaurant_profiles").upsert(
      {
        merchant_id: merchantId,
        restaurant_name: extracted.restaurantProfile.restaurantName,
        cuisine_type: extracted.restaurantProfile.cuisineType ?? null,
        tone_of_voice: extracted.restaurantProfile.toneOfVoice ?? null,
        target_clientele: extracted.restaurantProfile.targetAudience ?? null,
        metadata: mergedMetadata,
        updated_at: now,
      },
      { onConflict: "merchant_id" },
    );
    if (error && !isOptionalSchemaError(error.code)) {
      throw new Error(`Failed writing restaurant_profiles: ${error.message}`);
    }
  }

  await insertOptionalRows({
    table: "menu_items",
    rows: extracted.menuItems.map((item) => ({
      merchant_id: merchantId,
      name: item.name,
      description: item.description ?? null,
      category: item.category ?? null,
      updated_at: now,
    })),
  });

  const wineIdsByName = await upsertWineRows({
    merchantId,
    sourceDocumentId: documentId,
    rows: extracted.wines.map((wine) => ({
      name: wine.name,
      producer: wine.producer ?? null,
      region: wine.region ?? null,
      country: null,
      grape_varietal: wine.grapeVarietal ?? null,
      vintage: null,
      style: null,
      body: null,
      acidity: null,
      tasting_notes: wine.tastingNotes ?? null,
      approved_claims: wine.approvedClaims ?? null,
      price_band: null,
      metadata: {},
    })),
  });

  const wineIds = [...wineIdsByName.values()];
  if (wineIds.length > 0) {
    const supabase = getSupabaseAdminClient();
    const { error: deleteRulesError } = await supabase
      .from("wine_pairing_rules")
      .delete()
      .in("wine_id", wineIds);
    if (deleteRulesError && !isOptionalSchemaError(deleteRulesError.code)) {
      throw new Error(`Failed refreshing wine_pairing_rules: ${deleteRulesError.message}`);
    }
  }

  await insertOptionalRows({
    table: "wine_pairing_rules",
    rows: extracted.pairingRules.reduce<Array<Record<string, unknown>>>(
      (rows, rule) => {
        const wineId = wineIdsByName.get(rule.wineName);
        if (!wineId) return rows;
        rows.push({
          wine_id: wineId,
          pair_with: rule.pairWith ?? null,
          avoid_with: rule.avoidWith ?? null,
          pairing_rationale: rule.rationale ?? null,
          updated_at: now,
        });
        return rows;
      },
      [],
    ),
  });
}

export async function upsertWineRows(params: {
  merchantId: string;
  sourceDocumentId?: string | null;
  rows: WineImportRow[];
}) {
  const { merchantId, rows, sourceDocumentId = null } = params;
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const wineIdsByName = new Map<string, string>();

  for (const wine of rows) {
    const normalizedName = wine.name.trim();
    if (!normalizedName) continue;
    const { data: existing, error: lookupError } = await supabase
      .from("wines")
      .select("id,name")
      .eq("merchant_id", merchantId)
      .ilike("name", normalizedName)
      .limit(1)
      .maybeSingle();
    if (lookupError && !isOptionalSchemaError(lookupError.code)) {
      throw new Error(`Failed loading wines: ${lookupError.message}`);
    }

    const payload = {
      source_document_id: sourceDocumentId,
      name: normalizedName,
      producer: wine.producer ?? null,
      region: wine.region ?? null,
      country: wine.country ?? null,
      grape_varietal: wine.grape_varietal ?? null,
      vintage: wine.vintage ?? null,
      style: wine.style ?? null,
      body: wine.body ?? null,
      acidity: wine.acidity ?? null,
      tasting_notes: wine.tasting_notes ?? null,
      approved_claims: wine.approved_claims ?? null,
      price_band: wine.price_band ?? null,
      metadata: wine.metadata ?? {},
      updated_at: now,
    };

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("wines")
        .update(payload)
        .eq("id", existing.id);
      if (updateError && !isOptionalSchemaError(updateError.code)) {
        throw new Error(`Failed updating wine ${normalizedName}: ${updateError.message}`);
      }
      wineIdsByName.set(normalizedName, existing.id);
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("wines")
      .insert({
        merchant_id: merchantId,
        ...payload,
      })
      .select("id,name")
      .single();
    if (insertError && !isOptionalSchemaError(insertError.code)) {
      throw new Error(`Failed writing wines: ${insertError.message}`);
    }
    if (inserted?.id) {
      wineIdsByName.set(normalizedName, inserted.id);
    }
  }

  return wineIdsByName;
}

export async function ingestUploadedFiles(input: IngestionInput) {
  assertIngestionInput(input);

  const embeddings = getEmbeddingsClient();
  const embeddingModel = getEmbeddingModel();
  let totalChunks = 0;
  let totalSections = 0;
  let totalBlocks = 0;

  for (const file of input.files) {
    const parsed = await parseFileToText({
      file,
      merchantId: input.merchantId,
      sourceType: input.sourceType,
    });
    const checksum = crypto
      .createHash("sha256")
      .update(parsed.rawText)
      .digest("hex");

    let document: { id: string };
    try {
      document = await insertDocumentWithFallback({
        merchant_id: parsed.merchantId,
        source_type: parsed.sourceType,
        file_name: parsed.fileName,
        mime_type: parsed.mimeType,
        checksum,
        file_size: file.size,
        status: "processed",
        visibility_scope: parsed.sourceType === "ops" ? "global_ops" : "merchant_private",
        normalization_version: NORMALIZATION_VERSION,
        chunking_version: CHUNKING_VERSION,
        embedding_model: embeddingModel,
        embedding_dimensions: 1536,
        metadata: parsed.metadata,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Unknown database error";
      throw new Error(`Could not insert document ${parsed.fileName}: ${reason}`);
    }

    const supabase = getSupabaseAdminClient();

    const { error: blocksError } = await supabase.from("extracted_blocks").insert(
      parsed.extractedBlocks.map((block) => ({
        document_id: document.id,
        merchant_id: parsed.merchantId,
        source_type: parsed.sourceType,
        page_number: block.pageNumber,
        block_index: block.blockIndex,
        raw_text: block.rawText,
        block_metadata: block.metadata,
      })),
    );
    if (blocksError && !isOptionalSchemaError(blocksError.code)) {
      throw new Error(`Could not insert extracted blocks: ${blocksError.message}`);
    }
    totalBlocks += parsed.extractedBlocks.length;

    const normalizedSections = normalizeExtractionBlocks(parsed.extractedBlocks);
    const { data: insertedSections, error: sectionsError } = await supabase
      .from("normalized_sections")
      .insert(
        normalizedSections.map((section) => ({
          document_id: document.id,
          merchant_id: parsed.merchantId,
          source_type: parsed.sourceType,
          section_title: section.sectionTitle,
          section_text: section.sectionText,
          section_order: section.sectionOrder,
          normalization_version: NORMALIZATION_VERSION,
          metadata: section.metadata,
        })),
      )
      .select("id,section_order");

    if (sectionsError && !isOptionalSchemaError(sectionsError.code)) {
      throw new Error(`Could not insert normalized sections: ${sectionsError.message}`);
    }
    totalSections += normalizedSections.length;

    const structuredData = extractStructuredData({
      sourceType: parsed.sourceType,
      sections: normalizedSections,
    });
    await persistStructuredData({
      merchantId: parsed.merchantId,
      documentId: document.id,
      extracted: structuredData,
    });

    const chunks = await chunkParsedFile({
      file: parsed,
      sections: normalizedSections,
    });
    const sectionIdByOrder = new Map<number, string>();
    for (const section of insertedSections ?? []) {
      if (typeof section.id === "string" && typeof section.section_order === "number") {
        sectionIdByOrder.set(section.section_order, section.id);
      }
    }

    const vectors = await embeddings.embedDocuments(chunks.map((c) => c.content));
    for (const [index, chunk] of chunks.entries()) {
      const vector = vectors[index] ?? [];
      await insertDocumentChunk({
        documentId: document.id,
        merchantId: parsed.merchantId,
        sourceType: parsed.sourceType,
        sectionId: sectionIdByOrder.get(chunk.sectionOrder) ?? null,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        tokenCount: chunk.tokenCount,
        metadata: chunk.metadata,
        embedding: vector,
        chunkingVersion: CHUNKING_VERSION,
        embeddingModel,
        embeddingDimensions: vector.length || 1536,
        sectionTitle: chunk.sectionTitle,
        pageNumber: chunk.pageNumber,
      });
      totalChunks += 1;
    }
  }

  return {
    indexedFiles: input.files.length,
    totalBlocks,
    totalSections,
    totalChunks,
  };
}
