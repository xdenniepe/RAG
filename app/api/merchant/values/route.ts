import { NextResponse } from "next/server";

import { merchantIdSchema } from "@/lib/validation/forms";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const merchantId = merchantIdSchema.parse(
      url.searchParams.get("merchantId") ?? "",
    );
    const supabase = getSupabaseAdminClient();

    const [profileResult, menuResult, winesResult] = await Promise.all([
      supabase
        .from("restaurant_profiles")
        .select("restaurant_name,cuisine_type,target_clientele,tone_of_voice,metadata")
        .eq("merchant_id", merchantId)
        .maybeSingle(),
      supabase
        .from("menu_items")
        .select("name,description")
        .eq("merchant_id", merchantId)
        .order("updated_at", { ascending: false })
        .limit(200),
      supabase
        .from("wines")
        .select("name")
        .eq("merchant_id", merchantId)
        .order("updated_at", { ascending: false })
        .limit(200),
    ]);

    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }
    if (menuResult.error) {
      throw new Error(menuResult.error.message);
    }
    if (winesResult.error) {
      throw new Error(winesResult.error.message);
    }

    return NextResponse.json({
      profile: profileResult.data,
      menuItems: menuResult.data ?? [],
      wines: winesResult.data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed loading merchant values";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
