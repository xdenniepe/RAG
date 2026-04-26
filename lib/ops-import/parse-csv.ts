import { MAX_IMPORT_ROWS } from "@/lib/ops-import/limits";
import { toDraftRow } from "@/lib/ops-import/normalize";
import { WineImportDraftRow, WineImportRow } from "@/lib/ops-import/schema";

const HEADER_ALIASES: Record<string, keyof WineImportRow> = {
  name: "name",
  wine_name: "name",
  wine: "name",
  producer: "producer",
  winery: "producer",
  region: "region",
  country: "country",
  grape_varietal: "grape_varietal",
  grape: "grape_varietal",
  vintage: "vintage",
  style: "style",
  body: "body",
  acidity: "acidity",
  tasting_notes: "tasting_notes",
  approved_claims: "approved_claims",
  price_band: "price_band",
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function splitCsvLine(line: string) {
  const output: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      output.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  output.push(current);
  return output.map((value) => value.trim());
}

export function parseWineCsv(text: string) {
  const lines = text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => normalizeHeader(header));
  const mappedHeaders = headers.map((header) => HEADER_ALIASES[header] ?? null);
  if (!mappedHeaders.includes("name")) {
    throw new Error("CSV must include a name column (name or wine_name).");
  }

  const rows: WineImportDraftRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCsvLine(lines[index]);
    const row: Partial<WineImportRow> = {};

    mappedHeaders.forEach((mappedHeader, headerIndex) => {
      if (!mappedHeader) return;
      row[mappedHeader] = (values[headerIndex] ?? "") as never;
    });

    rows.push(
      toDraftRow({
        sourceRow: index + 1,
        row,
        confidence: 1,
      }),
    );

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new Error(`CSV exceeds row limit of ${MAX_IMPORT_ROWS}.`);
    }
  }

  return rows;
}
