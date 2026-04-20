import { getConvexClient } from "@/lib/convex/client";

type ConvexMutationClient = {
  mutation(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown>;
};

type ConvexQueryClient = {
  query(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown>;
};

export async function createGenerationJob(params: {
  merchantId: string;
  requestedBy: string;
  inputSummary: string;
}) {
  const client = getConvexClient();
  if (!client) return null;

  const unsafeClient = client as unknown as ConvexMutationClient;
  return (await unsafeClient.mutation("generationJobs:createGenerationJob", {
    merchantId: params.merchantId,
    requestedBy: params.requestedBy,
    inputSummary: params.inputSummary,
  })) as string;
}

export async function markGenerationRetrieving(jobId: string) {
  const client = getConvexClient();
  if (!client) return;
  const unsafeClient = client as unknown as ConvexMutationClient;
  await unsafeClient.mutation("generationJobs:markRetrieving", { jobId });
}

export async function markGenerationDrafting(
  jobId: string,
  retrievalSummary?: string,
) {
  const client = getConvexClient();
  if (!client) return;
  const unsafeClient = client as unknown as ConvexMutationClient;
  await unsafeClient.mutation("generationJobs:markDrafting", {
    jobId,
    retrievalSummary,
  });
}

export async function markGenerationRendering(jobId: string) {
  const client = getConvexClient();
  if (!client) return;
  const unsafeClient = client as unknown as ConvexMutationClient;
  await unsafeClient.mutation("generationJobs:markRendering", { jobId });
}

export async function completeGenerationJob(params: {
  jobId: string;
  publicId: string;
  merchantId: string;
  outputType: string;
  promptVersion: string;
  resultJson: string;
  renderedText: string;
}) {
  const client = getConvexClient();
  if (!client) return null;
  const unsafeClient = client as unknown as ConvexMutationClient;
  return (await unsafeClient.mutation("generationJobs:completeGenerationJob", {
    ...params,
  })) as string;
}

export async function failGenerationJob(jobId: string, errorMessage: string) {
  const client = getConvexClient();
  if (!client) return;
  const unsafeClient = client as unknown as ConvexMutationClient;
  await unsafeClient.mutation("generationJobs:failGenerationJob", {
    jobId,
    errorMessage,
  });
}

export async function getGenerationResultByPublicId(params: {
  merchantId: string;
  publicId: string;
}) {
  const client = getConvexClient();
  if (!client) return null;
  const unsafeClient = client as unknown as ConvexQueryClient;
  return (await unsafeClient.query("generationJobs:getGenerationResultByPublicId", {
    merchantId: params.merchantId,
    publicId: params.publicId,
  })) as
    | {
        _id: string;
        publicId?: string;
        merchantId: string;
        jobId: string;
        outputType: string;
        promptVersion: string;
        resultJson: string;
        renderedText: string;
        createdAt: number;
      }
    | null;
}
