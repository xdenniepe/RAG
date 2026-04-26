import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { onboardingSubmissionSchema } from "@/lib/validation/forms";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OnboardingProfileRow = {
  account_name: string | null;
  restaurant_name: string | null;
  restaurant_location: string | null;
  restaurant_website: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  restaurant_vibe: string | null;
  cuisine_type: string | null;
  target_clientele: string | null;
  tone_of_voice: string | null;
  metadata: Record<string, unknown> | null;
  onboarding_completed_at: string | null;
};

function splitLocationParts(location: string | null) {
  if (!location) {
    return {
      restaurantStreetAddress: "",
      restaurantCity: "",
      restaurantCountry: "",
    };
  }

  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return {
      restaurantStreetAddress: parts.slice(0, -2).join(", "),
      restaurantCity: parts[parts.length - 2] ?? "",
      restaurantCountry: parts[parts.length - 1] ?? "",
    };
  }

  if (parts.length === 2) {
    return {
      restaurantStreetAddress: parts[0] ?? "",
      restaurantCity: parts[1] ?? "",
      restaurantCountry: "",
    };
  }

  return {
    restaurantStreetAddress: parts[0] ?? "",
    restaurantCity: "",
    restaurantCountry: "",
  };
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function ensureVerifiedEmail() {
  const user = await currentUser();
  const isEmailVerified =
    user?.primaryEmailAddress?.verification?.status === "verified";
  if (!isEmailVerified) {
    return NextResponse.json(
      { error: "Confirm your email before onboarding." },
      { status: 403 },
    );
  }
  return null;
}

function normalizeProfile(row: OnboardingProfileRow | null) {
  const beverageProgramGoals =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.beverageProgramGoals === "string"
      ? row.metadata.beverageProgramGoals
      : "";
  const metadataStreetAddress =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantStreetAddress === "string"
      ? row.metadata.restaurantStreetAddress
      : "";
  const metadataCity =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantCity === "string"
      ? row.metadata.restaurantCity
      : "";
  const metadataAddressLine2 =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantAddressLine2 === "string"
      ? row.metadata.restaurantAddressLine2
      : "";
  const metadataState =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantState === "string"
      ? row.metadata.restaurantState
      : "";
  const metadataCountry =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.restaurantCountry === "string"
      ? row.metadata.restaurantCountry
      : "";
  const menuPdfFileName =
    row?.metadata &&
    typeof row.metadata === "object" &&
    typeof row.metadata.menuPdfFileName === "string"
      ? row.metadata.menuPdfFileName
      : "";
  const fallbackLocationParts = splitLocationParts(row?.restaurant_location ?? null);

  return {
    accountName: row?.account_name ?? "",
    restaurantName: row?.restaurant_name ?? "",
    restaurantStreetAddress:
      metadataStreetAddress || fallbackLocationParts.restaurantStreetAddress,
    restaurantAddressLine2: metadataAddressLine2,
    restaurantCity: metadataCity || fallbackLocationParts.restaurantCity,
    restaurantState: metadataState,
    restaurantCountry: metadataCountry || fallbackLocationParts.restaurantCountry,
    restaurantWebsite: row?.restaurant_website ?? "",
    menuPdfFileName,
    brandPrimaryColor: row?.brand_primary_color ?? "#4A165C",
    brandAccentColor: row?.brand_accent_color ?? "#C4A574",
    restaurantVibe: row?.restaurant_vibe ?? "",
    cuisineType: row?.cuisine_type ?? "",
    targetClientele: row?.target_clientele ?? "",
    toneOfVoice: row?.tone_of_voice ?? "",
    beverageProgramGoals,
    completedAt: row?.onboarding_completed_at ?? null,
    isCompleted: Boolean(row?.onboarding_completed_at),
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedResponse();
  }
  const emailGateResponse = await ensureVerifiedEmail();
  if (emailGateResponse) {
    return emailGateResponse;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select(
      "account_name,restaurant_name,restaurant_location,restaurant_website,brand_primary_color,brand_accent_color,restaurant_vibe,cuisine_type,target_clientele,tone_of_voice,metadata,onboarding_completed_at",
    )
    .eq("merchant_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    userId,
    profile: normalizeProfile((data as OnboardingProfileRow | null) ?? null),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedResponse();
  }
  const emailGateResponse = await ensureVerifiedEmail();
  if (emailGateResponse) {
    return emailGateResponse;
  }

  const body = await request.json();
  const validation = onboardingSubmissionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues.map((issue) => issue.message).join(" ") },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: existingProfile, error: fetchError } = await supabase
    .from("restaurant_profiles")
    .select("metadata,onboarding_completed_at")
    .eq("merchant_id", userId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (existingProfile?.onboarding_completed_at) {
    return NextResponse.json(
      { error: "Onboarding has already been completed." },
      { status: 409 },
    );
  }

  const mergedMetadata = {
    ...((existingProfile?.metadata as Record<string, unknown> | null) ?? {}),
    beverageProgramGoals: validation.data.beverageProgramGoals,
    restaurantStreetAddress: validation.data.restaurantStreetAddress,
    restaurantAddressLine2: validation.data.restaurantAddressLine2,
    restaurantCity: validation.data.restaurantCity,
    restaurantState: validation.data.restaurantState,
    restaurantCountry: validation.data.restaurantCountry,
    menuPdfFileName: validation.data.menuPdfFileName,
  };
  const restaurantLocation = [
    validation.data.restaurantStreetAddress,
    validation.data.restaurantAddressLine2,
    validation.data.restaurantCity,
    validation.data.restaurantState,
    validation.data.restaurantCountry,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");

  const { error: upsertError } = await supabase.from("restaurant_profiles").upsert(
    {
      merchant_id: userId,
      account_name: validation.data.accountName,
      restaurant_name: validation.data.restaurantName,
      restaurant_location: restaurantLocation,
      restaurant_website: validation.data.restaurantWebsite || null,
      brand_primary_color: validation.data.brandPrimaryColor,
      brand_accent_color: validation.data.brandAccentColor || null,
      restaurant_vibe: validation.data.restaurantVibe,
      cuisine_type: validation.data.cuisineType,
      target_clientele: validation.data.targetClientele,
      tone_of_voice: validation.data.toneOfVoice,
      metadata: mergedMetadata,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "merchant_id",
    },
  );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
