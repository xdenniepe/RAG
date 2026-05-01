"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { OpsEditorHeader } from "./ops-editor-header";
import { OpsEditorSteps, type OpsEditorStepItem } from "./ops-editor-steps";

export type OpsEditorStepDefinition = Omit<OpsEditorStepItem, "status">;

type OpsEditorStepsContextValue = {
  activeStep: string;
  setActiveStep: (step: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  setStepDefinitions: (steps: OpsEditorStepDefinition[]) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  activeStepNumber: number;
  totalSteps: number;
};

const OpsEditorStepsContext = createContext<OpsEditorStepsContextValue | null>(null);

function buildSteps(
  definitions: OpsEditorStepDefinition[],
  activeStep: string,
): OpsEditorStepItem[] {
  return definitions.map((step) => ({
    ...step,
    status: step.id === activeStep ? "active" : "inactive",
  }));
}

export function useOpsEditorSteps() {
  const context = useContext(OpsEditorStepsContext);
  if (!context) {
    throw new Error("useOpsEditorSteps must be used within OpsEditorShell.");
  }
  return context;
}

type OpsEditorShellProps = {
  children: ReactNode;
};

export function OpsEditorShell({ children }: OpsEditorShellProps) {
  const [activeStep, setActiveStep] = useState<string>("basic-info");
  const [stepDefinitions, setStepDefinitions] = useState<OpsEditorStepDefinition[]>([]);
  const stepOrder = stepDefinitions.map((step) => step.id);
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const isFirstStep = activeStepIndex <= 0;
  const isLastStep = activeStepIndex >= 0 && activeStepIndex === stepOrder.length - 1;
  const activeStepNumber = activeStepIndex >= 0 ? activeStepIndex + 1 : 0;
  const totalSteps = stepOrder.length;

  useEffect(() => {
    if (stepDefinitions.length === 0) {
      return;
    }
    const hasActiveStep = stepDefinitions.some((step) => step.id === activeStep);
    if (!hasActiveStep) {
      setActiveStep(stepDefinitions[0].id);
    }
  }, [activeStep, stepDefinitions]);

  const value = useMemo<OpsEditorStepsContextValue>(() => {
    return {
      activeStep,
      setActiveStep,
      setStepDefinitions,
      isFirstStep,
      isLastStep,
      activeStepNumber,
      totalSteps,
      goToNextStep: () => {
        setActiveStep((current) => {
          const index = stepOrder.indexOf(current);
          if (index < 0 || index >= stepOrder.length - 1) {
            return current;
          }
          return stepOrder[index + 1];
        });
      },
      goToPreviousStep: () => {
        setActiveStep((current) => {
          const index = stepOrder.indexOf(current);
          if (index <= 0) {
            return current;
          }
          return stepOrder[index - 1];
        });
      },
    };
  }, [
    activeStep,
    activeStepNumber,
    isFirstStep,
    isLastStep,
    stepDefinitions,
    stepOrder,
    totalSteps,
  ]);

  return (
    <OpsEditorStepsContext.Provider value={value}>
      <main className="flex-1 w-full max-w-none bg-[var(--page-canvas)]">
        <div className="flex w-full flex-col">
          <OpsEditorHeader />
          <div className="w-full border-b border-[var(--input-border)] bg-white p-6">
            <div className="mx-auto w-full max-w-5xl">
              <OpsEditorSteps
                steps={buildSteps(stepDefinitions, activeStep)}
                className="w-full"
              />
            </div>
          </div>
          <div className="mx-auto w-full max-w-5xl my-6">{children}</div>
        </div>
      </main>
    </OpsEditorStepsContext.Provider>
  );
}
