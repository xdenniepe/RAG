import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  createWineImportDraftSchema,
  wineImportDraftRowSchema,
  wineImportRowSchema,
} from "@/lib/ops-import/schema";

test("wineImportRowSchema accepts full wine shape", () => {
  const parsed = wineImportRowSchema.parse({
    name: "Estate Reserve",
    producer: "Silver Hills",
    region: "Napa Valley",
    country: "USA",
    grape_varietal: "Cabernet Sauvignon",
    vintage: "2020",
    style: "Bold red",
    body: "Full",
    acidity: "Medium",
    tasting_notes: "Blackberry, cedar",
    approved_claims: "Estate grown",
    price_band: "$40-$60",
    metadata: { source: "manual" },
  });
  assert.equal(parsed.name, "Estate Reserve");
  assert.equal(parsed.country, "USA");
});

test("createWineImportDraftSchema enforces row limits", () => {
  const baseRow = wineImportDraftRowSchema.parse({
    id: "8e51301d-f614-47dc-bfce-260556f52220",
    source_row: 1,
    name: "Estate Reserve",
    producer: null,
    region: null,
    country: null,
    grape_varietal: null,
    vintage: null,
    style: null,
    body: null,
    acidity: null,
    tasting_notes: null,
    approved_claims: null,
    price_band: null,
    metadata: {},
    status: "valid",
    confidence: 1,
    errors: [],
  });

  const tooManyRows = Array.from({ length: 1001 }, (_, index) => ({
    ...baseRow,
    id: index === 0 ? baseRow.id : crypto.randomUUID(),
  }));

  const result = createWineImportDraftSchema.safeParse({
    merchantId: "global-ops",
    mode: "csv",
    rows: tooManyRows,
  });
  assert.equal(result.success, false);
});
