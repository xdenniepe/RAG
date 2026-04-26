"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SourceType = "ops" | "restaurant";

type IngestionPanelProps = {
  sourceType: SourceType;
  title: string;
  description: string;
  merchantIdLabel: string;
  merchantPlaceholder: string;
  formFields: ReactNode;
  buildTextPayload: (formData: FormData) => { title: string; content: string };
  validateFormData?: (formData: FormData) => string[];
  defaultMerchantId?: string;
  onMerchantIdChange?: (merchantId: string) => void;
  onUploadSuccess?: (result: {
    indexedFiles: number;
    totalChunks: number;
    totalBlocks?: number;
    totalSections?: number;
  }) => void;
};

export function IngestionPanel(props: IngestionPanelProps) {
  const [merchantId, setMerchantId] = useState(props.defaultMerchantId ?? "demo-merchant");
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (props.defaultMerchantId && props.defaultMerchantId !== merchantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMerchantId(props.defaultMerchantId);
    }
  }, [props.defaultMerchantId, merchantId]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("merchantId", merchantId);
    formData.set("sourceType", props.sourceType);
    const validationErrors: string[] = [];

    if (!merchantId.trim()) {
      validationErrors.push("Merchant ID is required.");
    }
    if (props.validateFormData) {
      validationErrors.push(...props.validateFormData(formData));
    }

    const textPayload = props.buildTextPayload(formData);
    if (textPayload.content.trim()) {
      formData.set("textTitle", textPayload.title);
      formData.set("textContent", textPayload.content);
    }
    const uploadedFiles = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (uploadedFiles.length === 0 && !textPayload.content.trim()) {
      validationErrors.push("Provide details in the form or upload at least one file.");
    }
    if (validationErrors.length > 0) {
      setUploadStatus(validationErrors.join(" "));
      return;
    }

    setIsUploading(true);
    setUploadStatus("Uploading and indexing...");

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }
      setUploadStatus(
        `Done. Indexed ${payload.indexedFiles} file(s), ${payload.totalChunks} chunk(s).`,
      );
      props.onUploadSuccess?.({
        indexedFiles: payload.indexedFiles,
        totalChunks: payload.totalChunks,
        totalBlocks: payload.totalBlocks,
        totalSections: payload.totalSections,
      });
      form.reset();
    } catch (error) {
      setUploadStatus(
        error instanceof Error ? error.message : "Upload failed unexpectedly.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label>{props.merchantIdLabel}</Label>
            <Input
              value={merchantId}
              onChange={(event) => {
                const value = event.target.value;
                setMerchantId(value);
                props.onMerchantIdChange?.(value);
              }}
              placeholder={props.merchantPlaceholder}
              required
            />
          </div>

          {props.formFields}

          <div className="space-y-2">
            <Label>Optional files (pdf, doc/docx, jpg, jpeg, png)</Label>
            <Input
              type="file"
              name="files"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="border-dashed file:mr-4 file:rounded-sm file:border file:border-[var(--input-border)] file:px-2 file:py-1"
            />
          </div>

          <Button type="submit" disabled={isUploading}>
            {isUploading ? "Indexing..." : "Save and index"}
          </Button>
          {uploadStatus ? (
            <p className="text-sm text-[var(--muted-foreground)]">{uploadStatus}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
