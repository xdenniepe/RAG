import { OpsEditorShell } from "./ops-editor-shell";

export default function OpsEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OpsEditorShell>{children}</OpsEditorShell>;
}
