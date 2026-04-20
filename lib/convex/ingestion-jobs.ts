import { getConvexClient } from "@/lib/convex/client";

type SourceType = "ops" | "restaurant";

type ConvexMutationClient = {
  mutation(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown>;
};

export async function createJob(params: {
  merchantId: string;
  sourceType: SourceType;
  fileNames: string[];
  documentId?: string;
}) {
  const client = getConvexClient();
  if (!client) return null;

  const unsafeClient = client as unknown as ConvexMutationClient;
  return (await unsafeClient.mutation("ingestionJobs:createIngestionJob", {
    merchantId: params.merchantId,
    sourceType: params.sourceType,
    fileNames: params.fileNames,
    documentId: params.documentId,
  })) as string;
}

export async function markJobProcessing(jobId: string, stage?: string) {
  const client = getConvexClient();
  if (!client) return;

  const unsafeClient = client as unknown as ConvexMutationClient;
  await unsafeClient.mutation("ingestionJobs:markProcessing", {
    jobId,
    stage,
  });
}

export async function markJobCompleted(params: {
  jobId: string;
  indexedFiles: number;
  totalBlocks?: number;
  totalSections?: number;
  totalChunks: number;
}) {
  const client = getConvexClient();
  if (!client) return;

  const unsafeClient = client as unknown as ConvexMutationClient;
  await unsafeClient.mutation("ingestionJobs:markCompleted", params);
}

export async function markJobFailed(jobId: string, message: string) {
  const client = getConvexClient();
  if (!client) return;

  const unsafeClient = client as unknown as ConvexMutationClient;
  await unsafeClient.mutation("ingestionJobs:markFailed", {
    jobId,
    errorMessage: message,
    stage: "failed",
  });
}
