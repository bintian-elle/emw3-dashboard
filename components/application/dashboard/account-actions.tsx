"use client";
import { Button } from "@/components/base/buttons/button";
import { RiLogoutBoxRLine } from "@remixicon/react";

export function AccountActions() {
  return <form action="/api/auth/logout" method="post"><Button type="submit" size="small" variant="ghost" leadingIcon={RiLogoutBoxRLine}>Sign out</Button></form>;
}
