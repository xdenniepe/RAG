import crypto from "node:crypto";

import { WineImportDraftRow, WineImportRow, wineImportRowSchema } from "@/lib/ops-import/schema";

export function normalizeWineRow(input: Partial<WineImportRow>) {
  const parsed = wineImportRowSchema.safeParse(input);
  if (parsed.success) {
    return {
      row: parsed.data,
      errors: [] as string[],
      status: "valid" as const,
    };
  }

  const normalizedName = String(input.name ?? "").trim();
  const draftLike = {
    name: normalizedName,
    producer: normalizeNullable(input.producer),
    region: normalizeNullable(input.region),
    country: normalizeNullable(input.country),
    grape_varietal: normalizeNullable(input.grape_varietal),
    vintage: normalizeNullable(input.vintage),
    style: normalizeNullable(input.style),
    body: normalizeNullable(input.body),
    acidity: normalizeNullable(input.acidity),
    tasting_notes: normalizeNullable(input.tasting_notes),
    approved_claims: normalizeNullable(input.approved_claims),
    price_band: normalizeNullable(input.price_band),
    metadata: normalizeMetadata(input.metadata),
  } satisfies WineImportRow;

  return {
    row: draftLike,
    errors: parsed.error.issues.map((issue) => issue.message),
    status: "invalid" as const,
  };
}

export function toDraftRow(params: {
  sourceRow: number;
  row: Partial<WineImportRow>;
  confidence?: number | null;
}): WineImportDraftRow {
  const normalized = normalizeWineRow(params.row);
  return {
    id: crypto.randomUUID(),
    source_row: params.sourceRow,
    confidence: params.confidence ?? null,
    ...normalized.row,
    status: normalized.status,
    errors: normalized.errors,
  };
}

function normalizeNullable(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length ? normalized : null;
}

function normalizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}
