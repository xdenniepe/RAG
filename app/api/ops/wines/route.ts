import { NextResponse } from "next/server";

import { merchantIdSchema } from "@/lib/validation/forms";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const merchantId = merchantIdSchema.parse(url.searchParams.get("merchantId") ?? "");
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("wines")
      .select("id,name,producer,region,tasting_notes,approved_claims,updated_at")
      .eq("merchant_id", merchantId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      wines: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load saved wines";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
