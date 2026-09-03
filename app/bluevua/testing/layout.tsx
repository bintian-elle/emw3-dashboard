import type { ReactNode } from "react";
import { Suspense } from "react";
import { TestingSidebar } from "./testing-sidebar";

export default function TestingLayout({children}:{children:ReactNode}) {
  return <div className="min-h-screen bg-background-secondary-default lg:flex"><Suspense><TestingSidebar /></Suspense><main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1500px]">{children}</div></main></div>;
}
