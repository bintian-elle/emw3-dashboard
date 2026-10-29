import type { ReactNode } from "react";
import { EdmSidebar } from "./edm-sidebar";
import report from "../tracking/report-content.module.css";

export default function EdmLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${report.report} min-h-[calc(100dvh-3.75rem)] bg-[#f7f8fa] dark:bg-[#191a1d] lg:flex`}>
      <a href="#main-content" className="fixed left-4 top-4 z-100 -translate-y-24 rounded-lg bg-background-primary-default px-4 py-2 text-body-medium text-text-primary shadow-sm outline-none transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-border-focus-ring">
        Skip to content
      </a>
      <EdmSidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</main>
    </div>
  );
}
