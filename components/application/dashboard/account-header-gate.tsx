"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Workspaces with their own top bar render the account controls there. */
export function AccountHeaderGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const testing = pathname === "/bluevua/testing" || pathname.startsWith("/bluevua/testing/");

  return testing || (pathname === "/biceek/overview" || pathname.startsWith("/biceek/overview/")) ? null : children;
}
