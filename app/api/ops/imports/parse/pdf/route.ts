import { NextResponse } from "next/server";

import { MAX_IMPORT_FILE_BYTES } from "@/lib/ops-import/limits";
import { parsePdfToDraftRows } from "@/lib/ops-import/parse-pdf-ocr";
import { merchantIdSchema } from "@/lib/validation/forms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    merchantIdSchema.parse(String(formData.get("merchantId") ?? ""));
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new Error("PDF file is required.");
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      throw new Error(
        `PDF file exceeds ${Math.floor(MAX_IMPORT_FILE_BYTES / (1024 * 1024))}MB limit.`,
      );
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Only PDF files are supported.");
    }

    const rows = await parsePdfToDraftRows(file);
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not parse PDF file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
