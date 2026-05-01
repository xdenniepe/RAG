"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useOpsEditorSteps } from "@/app/(app)/ops/(editor)/ops-editor-shell";
import { ROUTES } from "@/lib/routes";

type OpsEditorStepControlsProps = {
  lastStepLabel?: string;
  onLastStepAction?: () => void;
  continueLabel?: string;
  className?: string;
};

export function OpsEditorStepControls({
  lastStepLabel,
  onLastStepAction,
  continueLabel = "Continue",
  className,
}: OpsEditorStepControlsProps) {
  const router = useRouter();
  const { goToNextStep, goToPreviousStep, isFirstStep, isLastStep } = useOpsEditorSteps();

  const secondaryLabel = isFirstStep ? "Cancel" : "Back";
  const primaryLabel = isLastStep ? (lastStepLabel ?? continueLabel) : continueLabel;
  const defaultLayoutClass = isFirstStep
    ? "flex items-center justify-end gap-3"
    : "flex items-center justify-between gap-3";

  function handleSecondaryAction() {
    if (isFirstStep) {
      router.push(ROUTES.ops.dashboard);
      return;
    }
    goToPreviousStep();
  }

  function handlePrimaryAction() {
    if (isLastStep && onLastStepAction) {
      onLastStepAction();
      return;
    }
    goToNextStep();
  }

  return (
    <div className={className ?? defaultLayoutClass}>
      <Button type="button" variant="secondary" onClick={handleSecondaryAction}>
        {secondaryLabel}
      </Button>
      <Button type="button" onClick={handlePrimaryAction}>
        {primaryLabel}
      </Button>
    </div>
  );
}
