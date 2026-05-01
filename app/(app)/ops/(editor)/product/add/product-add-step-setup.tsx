"use client";

import { useEffect } from "react";
import { CircleCheckBig, FileText, Info, Upload } from "lucide-react";

import {
  useOpsEditorSteps,
  type OpsEditorStepDefinition,
} from "@/app/(app)/ops/(editor)/ops-editor-shell";

const PRODUCT_ADD_STEPS: OpsEditorStepDefinition[] = [
  {
    id: "basic-info",
    icon: <Info className="size-4" />,
    info: "Product Info",
  },
  {
    id: "details",
    icon: <FileText className="size-4" />,
    info: "Product Details",
  },
  {
    id: "upload-sources",
    icon: <Upload className="size-4" />,
    info: "Upload Assets",
  },
  {
    id: "review",
    icon: <CircleCheckBig className="size-4" />,
    info: "Review",
  },
];

export function ProductAddStepSetup() {
  const { setActiveStep, setStepDefinitions } = useOpsEditorSteps();

  useEffect(() => {
    setStepDefinitions(PRODUCT_ADD_STEPS);
    setActiveStep("basic-info");
  }, [setActiveStep, setStepDefinitions]);

  return null;
}
