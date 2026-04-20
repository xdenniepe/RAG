import { ParsedFile, SourceType } from "@/lib/ingestion/types";
import { parseDocxFile } from "@/lib/ingestion/parse-docx";
import { parseImageFile } from "@/lib/ingestion/parse-image";
import { parsePdfFile } from "@/lib/ingestion/parse-pdf";

const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "text/plain",
]);

function cleanText(text: string) {
  return text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function parsePlainText(file: File) {
  return cleanText(await file.text());
}

export async function parseFileToText(params: {
  file: File;
  merchantId: string;
  sourceType: SourceType;
}): Promise<ParsedFile> {
  const { file, merchantId, sourceType } = params;
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error(
      `Unsupported file type ${file.type || "unknown"} for ${file.name}`,
    );
  }

  let rawText = "";
  if (file.type === "application/pdf") {
    rawText = await parsePdfFile(file);
  } else if (file.type === "application/msword") {
    throw new Error(
      `${file.name} is a legacy .doc file. Please convert it to .docx first.`,
    );
  } else if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    rawText = await parseDocxFile(file);
  } else if (file.type === "text/plain") {
    rawText = await parsePlainText(file);
  } else {
    rawText = await parseImageFile(file);
  }

  if (!rawText.trim()) {
    throw new Error(`No extractable text found in ${file.name}`);
  }

  return {
    fileName: file.name,
    mimeType: file.type,
    sourceType,
    merchantId,
    rawText,
    extractedBlocks: [
      {
        blockIndex: 0,
        pageNumber: null,
        rawText,
        metadata: {
          parser: file.type || "unknown",
        },
      },
    ],
    metadata: {
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    },
  };
}
