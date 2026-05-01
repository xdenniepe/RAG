"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type OpsEditorStepStatus = "active" | "inactive";

export type OpsEditorStepItem = {
  id: string;
  icon: ReactNode;
  info: string;
  status: OpsEditorStepStatus;
  section?: ReactNode;
};

type OpsEditorStepsProps = {
  steps: OpsEditorStepItem[];
  className?: string;
};

export function OpsEditorSteps({ steps, className }: OpsEditorStepsProps) {
  if (steps.length === 0) {
    return null;
  }

  const activeStepIndex = steps.findIndex((step) => step.status === "active");
  const activeStep = activeStepIndex >= 0 ? steps[activeStepIndex] : null;

  return (
    <div className={cn("w-full", className)}>
      <ol className="mx-auto flex w-full max-w-4xl items-start overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const isCurrent = step.status === "active";
          const isReached = activeStepIndex >= 0 && index <= activeStepIndex;
          const isLastStep = index === steps.length - 1;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-start",
                isLastStep ? "flex-none" : "flex-1 gap-3",
              )}
            >
              <div className="flex min-w-0 shrink-0 flex-col items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-full border",
                    isReached
                      ? "border-transparent bg-[var(--secondary)] text-white"
                      : "border-[var(--input-border)] bg-[var(--surface-elevated)] text-[var(--muted-foreground)]",
                  )}
                  aria-hidden
                >
                  {step.icon}
                </span>
                <span
                  className={cn(
                    "text-center text-xs font-medium",
                    isReached ? "text-[var(--secondary)]" : "text-[var(--muted-foreground)]",
                    isCurrent ? "text-[var(--secondary)]" : "",
                  )}
                >
                  {step.info}
                </span>
              </div>
              {!isLastStep ? (
                <span
                  className={cn(
                    "mx-4 mt-5 h-0.5 min-w-6 flex-1 rounded-full sm:mx-6",
                    activeStepIndex >= 0 && index < activeStepIndex
                      ? "bg-[var(--secondary)]"
                      : "bg-[var(--input-border)]",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {activeStep?.section ? <div>{activeStep.section}</div> : null}
    </div>
  );
}
