"use server";

import { ingestUploadedFiles } from "@/lib/ingestion/pipeline";
import { SOURCE_TYPES, SourceType } from "@/lib/ingestion/types";
import {
  createJob,
  markJobCompleted,
  markJobFailed,
  markJobProcessing,
} from "@/lib/convex/ingestion-jobs";
import { merchantIdSchema } from "@/lib/validation/forms";

const MAX_FILE_COUNT = 25;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function parseSourceType(value: string): SourceType {
  if (!SOURCE_TYPES.includes(value as SourceType)) {
    throw new Error("sourceType must be ops or restaurant");
  }
  return value as SourceType;
}

export async function ingestFromFormData(formData: FormData) {
  const merchantId = merchantIdSchema.parse(String(formData.get("merchantId") ?? ""));
  const sourceType = parseSourceType(String(formData.get("sourceType") ?? ""));
  const uploadedFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const textTitle = String(formData.get("textTitle") ?? "").trim();
  const textContent = String(formData.get("textContent") ?? "").trim();
  const files = [...uploadedFiles];

  if (textContent) {
    files.push(
      new File([textContent], `${textTitle || `${sourceType}-form-entry`}.txt`, {
        type: "text/plain",
      }),
    );
  }
  if (files.length === 0) {
    throw new Error("Please upload at least one file or provide form details.");
  }
  if (files.length > MAX_FILE_COUNT) {
    throw new Error(`Upload up to ${MAX_FILE_COUNT} files per request.`);
  }
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `${file.name} exceeds the ${Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB limit.`,
      );
    }
  }

  const jobId = await createJob({
    merchantId,
    sourceType,
    fileNames: files.map((file) => file.name),
  });

  if (jobId) {
    await markJobProcessing(jobId, "extraction");
  }

  try {
    const result = await ingestUploadedFiles({
      merchantId,
      sourceType,
      files,
    });

    if (jobId) {
      await markJobCompleted({
        jobId,
        indexedFiles: result.indexedFiles,
        totalBlocks: result.totalBlocks,
        totalSections: result.totalSections,
        totalChunks: result.totalChunks,
      });
    }

    return result;
  } catch (error) {
    if (jobId) {
      await markJobFailed(
        jobId,
        error instanceof Error ? error.message : "Unknown ingestion error",
      );
    }
    throw error;
  }
}
