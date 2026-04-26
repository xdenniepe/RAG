import { NextResponse } from "next/server";

import { MAX_IMPORT_FILE_BYTES } from "@/lib/ops-import/limits";
import { parseWineCsv } from "@/lib/ops-import/parse-csv";
import { merchantIdSchema } from "@/lib/validation/forms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    merchantIdSchema.parse(String(formData.get("merchantId") ?? ""));
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("CSV file is required.");
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      throw new Error(
        `CSV file exceeds ${Math.floor(MAX_IMPORT_FILE_BYTES / (1024 * 1024))}MB limit.`,
      );
    }
    if (
      file.type !== "text/csv" &&
      !file.name.toLowerCase().endsWith(".csv")
    ) {
      throw new Error("Only CSV files are supported.");
    }

    const text = await file.text();
    const rows = parseWineCsv(text);
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse CSV file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
