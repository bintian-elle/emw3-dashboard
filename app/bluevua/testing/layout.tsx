import { CampaignNavigator } from "./campaign-navigator";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { TestingSidebar } from "./testing-sidebar";

export default function TestingLayout({children}:{children:ReactNode}) {
  return <div className="min-h-screen bg-background-secondary-default lg:flex"><Suspense><TestingSidebar /></Suspense><main data-testing-content className="min-w-0 flex-1 p-4 pb-32 sm:p-6 sm:pb-32 lg:p-8 lg:pb-32 [&_tr>th:last-child]:pr-6 [&_tr>td:last-child]:pr-6"><div className="mx-auto max-w-[1500px]">{children}</div></main><Suspense><CampaignNavigator/></Suspense></div>;
}
