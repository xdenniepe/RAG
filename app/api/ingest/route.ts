import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { ingestFromFormData } from "@/actions/ingestion";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const formData = await request.formData();
    const result = await ingestFromFormData(formData);
    return NextResponse.json({
      ...result,
      requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ingestion request failed";
    return NextResponse.json({ error: message, requestId }, { status: 400 });
  }
}
