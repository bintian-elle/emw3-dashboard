import type { ReactNode } from "react";
import { ScriptLabShell } from "@/app/ai-tools/script-lab/workbench";
import { CustomerProjectLayout } from "../customer-project-page";

export default function WorkbenchLayout({ children }: { children: ReactNode }) {
  return <CustomerProjectLayout><ScriptLabShell publicView>{children}</ScriptLabShell></CustomerProjectLayout>;
}
