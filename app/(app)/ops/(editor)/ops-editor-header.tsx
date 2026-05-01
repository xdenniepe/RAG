"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/routes";
import { ArrowLeftIcon } from "lucide-react";
import { useOpsEditorSteps } from "./ops-editor-shell";

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveHeaderContent(pathname: string) {
  if (!pathname.startsWith(`${ROUTES.ops.root}/`)) {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  const mode = segments.at(-1);
  const entity = segments.at(-2);

  if (!mode || !entity || (mode !== "add" && mode !== "edit")) {
    return null;
  }

  const actionLabel = mode === "add" ? "Add" : "Edit";
  const entityLabel = toTitleCase(entity);

  return {
    title: `${actionLabel} ${entityLabel}`,
    subtitle:
      mode === "add"
        ? `${entityLabel} form and details`
        : `${entityLabel} information and settings`,
    stepLabel: mode === "add" ? "Step 1 of 4" : "Edit mode",
  };
}

export function OpsEditorHeader() {
  const pathname = usePathname();
  const content = resolveHeaderContent(pathname);
  const { activeStepNumber, totalSteps } = useOpsEditorSteps();

  if (!content) {
    return null;
  }

  const stepLabel =
    totalSteps > 0 && activeStepNumber > 0
      ? `Step ${activeStepNumber} of ${totalSteps}`
      : content.stepLabel;

  return (
    <header className="flex flex-col gap-3 bg-white border-b border-[var(--input-border)] px-4 py-4 sm:px-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-row items-start justify-between w-full max-w-5xl mx-auto">
        <div className="min-w-0 space-y-2">
          <Link
            href={ROUTES.ops.dashboard}
            className="inline-flex text-sm font-medium text-[var(--muted-foreground)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
          >
            <ArrowLeftIcon className="size-4 mr-2" /> Back to Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{content.title}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{content.subtitle}</p>
          </div>
        </div>
        <div className="inline-flex items-center rounded-md border border-[var(--secondary)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--secondary)]">
          {stepLabel}
        </div>
      </div>
    </header>
  );
}
