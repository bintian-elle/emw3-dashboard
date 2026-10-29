"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Testing renders the account controls in its own workspace top bar. */
export function AccountHeaderGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const testing = pathname === "/bluevua/testing" || pathname.startsWith("/bluevua/testing/");

  return testing || pathname === "/" ? null : children;
}
