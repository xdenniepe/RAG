import { ExtractionBlock, NormalizedSection } from "@/lib/ingestion/types";

export const NORMALIZATION_VERSION = "normalize_v1";

function normalizeText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

function detectTitle(sectionText: string): string | null {
  const firstLine = sectionText.split("\n")[0]?.trim() ?? "";
  if (!firstLine) return null;
  if (firstLine.length > 80) return null;
  if (/^[A-Z0-9\s:,&-]+$/.test(firstLine)) {
    return firstLine;
  }
  if (/^[A-Z][A-Za-z0-9\s:,&-]{1,60}$/.test(firstLine) && firstLine.endsWith(":")) {
    return firstLine.replace(/:$/, "").trim();
  }
  return null;
}

export function normalizeExtractionBlocks(
  blocks: ExtractionBlock[],
): NormalizedSection[] {
  const joined = blocks
    .map((block) => normalizeText(block.rawText))
    .filter(Boolean)
    .join("\n\n");

  const candidates = joined
    .split(/\n{2,}/)
    .map((part) => normalizeText(part))
    .filter((part) => part.length > 0);

  return candidates.map((sectionText, index) => ({
    sectionOrder: index,
    sectionTitle: detectTitle(sectionText),
    sectionText,
    metadata: {
      normalizationVersion: NORMALIZATION_VERSION,
      sectionLength: sectionText.length,
    },
  }));
}
