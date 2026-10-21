import { currentSiteUser } from "@/lib/current-site-user";
import { createHash } from "node:crypto";
import { TestingAiProvider } from "./testing-ai";
import { CampaignNavigator } from "./campaign-navigator";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { TestingSidebar } from "./testing-sidebar";

export default async function TestingLayout({children}:{children:ReactNode}) {
  const user=await currentSiteUser();
  const owner=createHash("sha256").update(user?.sub??"anonymous").digest("hex");
  return <Suspense><TestingAiProvider key={owner} owner={owner}><div className="min-h-screen bg-background-secondary-default lg:flex"><Suspense><TestingSidebar /></Suspense><main data-testing-content className="min-w-0 flex-1 p-4 pb-32 sm:p-6 sm:pb-32 lg:p-8 lg:pb-32 [&_tr>th:last-child]:pr-6 [&_tr>td:last-child]:pr-6"><div className="mx-auto min-w-0 max-w-[1500px]">{children}</div></main><Suspense><CampaignNavigator/></Suspense></div></TestingAiProvider></Suspense>;
}
