import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  CreateWineImportDraftInput,
  WineImportDraftRow,
  createWineImportDraftSchema,
  updateWineImportDraftRowsSchema,
} from "@/lib/ops-import/schema";

type DraftRecord = {
  id: string;
  merchant_id: string;
  import_mode: "manual" | "csv" | "pdf";
  rows: WineImportDraftRow[];
  status: "draft" | "finalized" | "abandoned";
  created_at: string;
  updated_at: string;
};

function normalizeDraftRecord(record: DraftRecord) {
  return {
    id: record.id,
    merchantId: record.merchant_id,
    mode: record.import_mode,
    rows: record.rows,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function createOpsImportDraft(input: CreateWineImportDraftInput) {
  const parsed = createWineImportDraftSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ops_import_drafts")
    .insert({
      merchant_id: parsed.merchantId,
      import_mode: parsed.mode,
      rows: parsed.rows,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Could not create ops import draft.");
  }

  return data.id as string;
}

export async function getOpsImportDraft(draftId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ops_import_drafts")
    .select("id,merchant_id,import_mode,rows,status,created_at,updated_at")
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return normalizeDraftRecord(data as DraftRecord);
}

export async function updateOpsImportDraftRows(params: {
  draftId: string;
  rows: WineImportDraftRow[];
}) {
  const parsed = updateWineImportDraftRowsSchema.parse({ rows: params.rows });
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("ops_import_drafts")
    .update({
      rows: parsed.rows,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.draftId)
    .eq("status", "draft");

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeRowsFromOpsImportDraft(params: {
  draftId: string;
  rowIds: string[];
}) {
  if (params.rowIds.length === 0) return;
  const draft = await getOpsImportDraft(params.draftId);
  if (!draft) {
    throw new Error("Draft not found.");
  }
  const nextRows = draft.rows.filter((row) => !params.rowIds.includes(row.id));
  if (nextRows.length === 0) {
    throw new Error("At least one row must remain in the draft.");
  }
  await updateOpsImportDraftRows({
    draftId: params.draftId,
    rows: nextRows,
  });
}

export async function markOpsImportDraftFinalized(draftId: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("ops_import_drafts")
    .update({
      status: "finalized",
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("status", "draft");
  if (error) {
    throw new Error(error.message);
  }
}
