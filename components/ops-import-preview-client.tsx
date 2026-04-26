"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WineImportDraftRow } from "@/lib/ops-import/schema";

type DraftPayload = {
  id: string;
  merchantId: string;
  mode: "manual" | "csv" | "pdf";
  status: "draft" | "finalized" | "abandoned";
  rows: WineImportDraftRow[];
};

const ROW_FIELDS: Array<{
  key: keyof WineImportDraftRow;
  label: string;
  multiline?: boolean;
}> = [
  { key: "name", label: "Name" },
  { key: "producer", label: "Producer" },
  { key: "region", label: "Region" },
  { key: "country", label: "Country" },
  { key: "grape_varietal", label: "Grape varietal" },
  { key: "vintage", label: "Vintage" },
  { key: "style", label: "Style" },
  { key: "body", label: "Body" },
  { key: "acidity", label: "Acidity" },
  { key: "tasting_notes", label: "Tasting notes", multiline: true },
  { key: "approved_claims", label: "Approved claims", multiline: true },
  { key: "price_band", label: "Price band" },
];

export function OpsImportPreviewClient({ draftId }: { draftId: string }) {
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [status, setStatus] = useState("Loading draft...");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadDraft = useCallback(async () => {
    const response = await fetch(`/api/ops/imports/drafts/${draftId}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Could not load draft.");
    }
    setDraft(payload.draft);
  }, [draftId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDraft()
      .then(() => setStatus(""))
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : "Could not load draft."),
      );
  }, [loadDraft]);

  const validCount = useMemo(
    () => draft?.rows.filter((row) => row.status === "valid").length ?? 0,
    [draft],
  );

  function updateField(
    rowId: string,
    key: keyof WineImportDraftRow,
    value: unknown,
  ) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        rows: current.rows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                [key]: value,
              }
            : row,
        ),
      };
    });
  }

  async function saveDraftRows() {
    if (!draft) return;
    setIsSaving(true);
    setStatus("Saving changes...");
    try {
      const response = await fetch(`/api/ops/imports/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: draft.rows }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save draft rows.");
      }
      setDraft(payload.draft);
      setStatus("Changes saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save draft rows.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeRow(rowId: string) {
    setStatus("Removing row...");
    try {
      const response = await fetch(`/api/ops/imports/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIds: [rowId] }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not remove row.");
      }
      setDraft(payload.draft);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not remove row.");
    }
  }

  async function finalizeImport() {
    setIsImporting(true);
    setStatus("Importing rows...");
    try {
      const response = await fetch(`/api/ops/imports/drafts/${draftId}/finalize`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not import rows.");
      }
      setStatus(`Imported ${payload.importedRows} rows.`);
      await loadDraft();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import rows.");
    } finally {
      setIsImporting(false);
    }
  }

  if (!draft) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-[var(--muted-foreground)]">{status}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Review before import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            Mode: {draft.mode.toUpperCase()} | Merchant: {draft.merchantId} | Valid rows:{" "}
            {validCount}/{draft.rows.length}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveDraftRows} disabled={isSaving || draft.status !== "draft"}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              variant="success"
              onClick={finalizeImport}
              disabled={isImporting || draft.status !== "draft"}
            >
              {isImporting ? "Importing..." : "Import rows"}
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/ops">Back to Ops</Link>
            </Button>
          </div>
          {status ? <p className="text-sm text-[var(--muted-foreground)]">{status}</p> : null}
        </CardContent>
      </Card>

      {draft.rows.map((row, index) => (
        <Card key={row.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>
                Row {index + 1} ({row.status})
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(row.id)}
                disabled={draft.rows.length <= 1 || draft.status !== "draft"}
              >
                Remove
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ROW_FIELDS.map((field) => (
              <div key={`${row.id}-${String(field.key)}`} className="space-y-1">
                <Label>{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    value={String(row[field.key] ?? "")}
                    onChange={(event) =>
                      updateField(row.id, field.key, event.target.value)
                    }
                    disabled={draft.status !== "draft"}
                  />
                ) : (
                  <Input
                    value={String(row[field.key] ?? "")}
                    onChange={(event) =>
                      updateField(row.id, field.key, event.target.value)
                    }
                    disabled={draft.status !== "draft"}
                  />
                )}
              </div>
            ))}
            <div className="space-y-1">
              <Label>Metadata (JSON)</Label>
              <Textarea
                value={JSON.stringify(row.metadata ?? {}, null, 2)}
                onChange={(event) => {
                  try {
                    const parsed = JSON.parse(event.target.value);
                    updateField(row.id, "metadata", parsed);
                  } catch {
                    updateField(row.id, "status", "invalid");
                    updateField(row.id, "errors", [
                      "Metadata must be valid JSON before saving.",
                    ]);
                  }
                }}
                disabled={draft.status !== "draft"}
              />
            </div>
            {row.errors.length ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--muted-foreground)]">
                {row.errors.map((error) => (
                  <li key={`${row.id}-${error}`}>{error}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
