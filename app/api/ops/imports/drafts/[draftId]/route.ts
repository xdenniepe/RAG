import { NextResponse } from "next/server";

import {
  getOpsImportDraft,
  removeRowsFromOpsImportDraft,
  updateOpsImportDraftRows,
} from "@/lib/ops-import/drafts";
import { updateWineImportDraftRowsSchema } from "@/lib/ops-import/schema";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    draftId: string;
  }>;
};

export async function GET(_: Request, context: RouteParams) {
  try {
    const { draftId } = await context.params;
    const draft = await getOpsImportDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  try {
    const { draftId } = await context.params;
    const payload = await request.json();
    if (Array.isArray(payload.rowIds)) {
      await removeRowsFromOpsImportDraft({
        draftId,
        rowIds: payload.rowIds,
      });
    } else {
      const parsed = updateWineImportDraftRowsSchema.parse(payload);
      await updateOpsImportDraftRows({
        draftId,
        rows: parsed.rows,
      });
    }
    const draft = await getOpsImportDraft(draftId);
    return NextResponse.json({ draft });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
