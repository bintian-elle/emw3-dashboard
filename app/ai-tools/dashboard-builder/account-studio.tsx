import { createHash } from "node:crypto";
import type { ComponentProps } from "react";
import { currentSiteUser } from "@/lib/current-site-user";
import { DashboardStudio } from "./studio";

export async function AccountDashboardStudio(props: Omit<ComponentProps<typeof DashboardStudio>, "ownerKey">) {
  const user = await currentSiteUser();
  const ownerKey = user ? createHash("sha256").update(user.sub).digest("hex") : "local-preview";
  return <DashboardStudio {...props} ownerKey={ownerKey} />;
}
