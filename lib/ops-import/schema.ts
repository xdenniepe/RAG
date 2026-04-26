import { z } from "zod";

export const OPS_IMPORT_MODES = ["manual", "csv", "pdf"] as const;

export const opsImportModeSchema = z.enum(OPS_IMPORT_MODES);

const nullableTextField = z
  .string()
  .trim()
  .max(4000, "Field is too long.")
  .transform((value) => (value.length ? value : null))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const wineImportRowSchema = z.object({
  name: z.string().trim().min(1, "Wine name is required.").max(300),
  producer: nullableTextField,
  region: nullableTextField,
  country: nullableTextField,
  grape_varietal: nullableTextField,
  vintage: nullableTextField,
  style: nullableTextField,
  body: nullableTextField,
  acidity: nullableTextField,
  tasting_notes: nullableTextField,
  approved_claims: nullableTextField,
  price_band: nullableTextField,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const wineImportDraftRowSchema = wineImportRowSchema.extend({
  id: z.string().uuid(),
  source_row: z.number().int().positive(),
  status: z.enum(["valid", "invalid"]).default("valid"),
  confidence: z.number().min(0).max(1).nullable().default(null),
  errors: z.array(z.string()).default([]),
});

export const createWineImportDraftSchema = z.object({
  merchantId: z.string().trim().min(2).max(64),
  mode: opsImportModeSchema,
  rows: z.array(wineImportDraftRowSchema).min(1).max(1000),
});

export const updateWineImportDraftRowsSchema = z.object({
  rows: z.array(wineImportDraftRowSchema).min(1).max(1000),
});

export type OpsImportMode = z.infer<typeof opsImportModeSchema>;
export type WineImportRow = z.infer<typeof wineImportRowSchema>;
export type WineImportDraftRow = z.infer<typeof wineImportDraftRowSchema>;
export type CreateWineImportDraftInput = z.infer<typeof createWineImportDraftSchema>;
