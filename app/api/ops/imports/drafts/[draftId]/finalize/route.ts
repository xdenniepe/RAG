import { NextResponse } from "next/server";

import { upsertWineRows } from "@/lib/ingestion/pipeline";
import { getOpsImportDraft, markOpsImportDraftFinalized } from "@/lib/ops-import/drafts";
import { wineImportRowSchema } from "@/lib/ops-import/schema";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    draftId: string;
  }>;
};

export async function POST(_: Request, context: RouteParams) {
  try {
    const { draftId } = await context.params;
    const draft = await getOpsImportDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found." }, { status: 404 });
    }
    if (draft.status !== "draft") {
      return NextResponse.json(
        { error: "This draft is no longer editable." },
        { status: 400 },
      );
    }
    const validatedRows = draft.rows
      .filter((row) => row.status === "valid")
      .map((row) => wineImportRowSchema.parse(row));
    if (validatedRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows to import." },
        { status: 400 },
      );
    }
    await upsertWineRows({
      merchantId: draft.merchantId,
      sourceDocumentId: null,
      rows: validatedRows,
    });
    await markOpsImportDraftFinalized(draftId);
    return NextResponse.json({
      importedRows: validatedRows.length,
      draftId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finalize draft.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
