"use client";

import { useEffect } from "react";
import { CircleCheckBig, FileText, Info, Upload } from "lucide-react";

import {
  useOpsEditorSteps,
  type OpsEditorStepDefinition,
} from "@/app/(app)/ops/(editor)/ops-editor-shell";

const PRODUCER_ADD_STEPS: OpsEditorStepDefinition[] = [
  {
    id: "basic-info",
    icon: <Info className="size-6" />,
    info: "Basic Info",
  },
  {
    id: "details",
    icon: <FileText className="size-6" />,
    info: "Producer Details",
  },
  {
    id: "upload-sources",
    icon: <Upload className="size-6" />,
    info: "Upload Sources",
  },
  {
    id: "review",
    icon: <CircleCheckBig className="size-6" />,
    info: "Review",
  },
];

export function ProducerAddStepSetup() {
  const { setActiveStep, setStepDefinitions } = useOpsEditorSteps();

  useEffect(() => {
    setStepDefinitions(PRODUCER_ADD_STEPS);
    setActiveStep("basic-info");
  }, [setActiveStep, setStepDefinitions]);

  return null;
}
