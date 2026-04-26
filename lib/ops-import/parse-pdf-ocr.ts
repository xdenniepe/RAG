import { extractTextFromPdfWithOpenAI } from "@/lib/ai/openai";
import { MAX_IMPORT_ROWS } from "@/lib/ops-import/limits";
import { toDraftRow } from "@/lib/ops-import/normalize";
import { WineImportDraftRow, WineImportRow } from "@/lib/ops-import/schema";

const FIELD_ALIASES: Record<string, keyof WineImportRow> = {
  name: "name",
  wine_name: "name",
  wine: "name",
  producer: "producer",
  winery: "producer",
  region: "region",
  country: "country",
  grape_varietal: "grape_varietal",
  grape: "grape_varietal",
  varietal: "grape_varietal",
  vintage: "vintage",
  style: "style",
  body: "body",
  acidity: "acidity",
  tasting_notes: "tasting_notes",
  approved_claims: "approved_claims",
  price_band: "price_band",
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseBlock(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const row: Partial<WineImportRow> = {};
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex <= 0) continue;
    const key = normalizeKey(line.slice(0, colonIndex));
    const value = line.slice(colonIndex + 1).trim();
    const field = FIELD_ALIASES[key];
    if (!field) continue;
    row[field] = value as never;
  }

  if (!row.name) {
    row.name = lines[0] ?? "";
  }
  return row;
}

export async function parsePdfToDraftRows(file: File) {
  const ocrText = await extractTextFromPdfWithOpenAI(file);
  if (!ocrText.trim()) {
    throw new Error("OCR could not extract text from this PDF.");
  }

  const blocks = ocrText
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (!blocks.length) {
    throw new Error("No product rows were detected in OCR text.");
  }

  const rows: WineImportDraftRow[] = [];
  blocks.forEach((block, index) => {
    if (rows.length >= MAX_IMPORT_ROWS) return;
    rows.push(
      toDraftRow({
        sourceRow: index + 1,
        row: parseBlock(block),
        confidence: 0.7,
      }),
    );
  });

  if (!rows.length) {
    throw new Error("No product rows were generated from this PDF.");
  }

  return rows;
}
