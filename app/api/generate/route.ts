import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { generateReport } from "@/actions/generation";
import { generateMarketingRequestSchema } from "@/lib/validation/forms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json();
    const requestedByHeader = request.headers.get("x-actor-id");
    const payload = generateMarketingRequestSchema.parse({
      ...body,
      requestedBy: body.requestedBy ?? requestedByHeader ?? "anonymous",
    });
    const report = await generateReport(payload);
    return NextResponse.json({
      ...report,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation request failed";
    return NextResponse.json({ error: message, requestId }, { status: 400 });
  }
}
