import { NextResponse } from "next/server";

import { createOpsImportDraft } from "@/lib/ops-import/drafts";
import { createWineImportDraftSchema } from "@/lib/ops-import/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = createWineImportDraftSchema.parse(payload);
    const draftId = await createOpsImportDraft(parsed);
    return NextResponse.json({ draftId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
