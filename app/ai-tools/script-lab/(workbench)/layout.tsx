import type { ReactNode } from "react";
import { ScriptLabShell } from "@/app/ai-tools/script-lab/workbench";

export default function WorkbenchLayout({ children }: { children: ReactNode }) {
  return <ScriptLabShell publicView={false}>{children}</ScriptLabShell>;
}
