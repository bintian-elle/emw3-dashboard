"use client";

import { LayoutDashboard } from "lucide-react";
import { ReportSidebar } from "../tracking/report-sidebar";

export function EdmSidebarClient({ updated }: { updated: string }) {
  return <ReportSidebar title="EDM" updated={updated} items={[{ href: "/bluevua/edm", label: "Overview", icon: LayoutDashboard, active: true }]}/>;
}
