import type { ReactNode } from "react";
import { EdmSidebar } from "./edm-sidebar";

export default function EdmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-full lg:flex">
      <EdmSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
