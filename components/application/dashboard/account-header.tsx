import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/site-auth";
import { AccountActions } from "@/components/application/dashboard/account-actions";

export async function AccountHeader() {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return null;
  return <header className="flex min-h-16 items-center justify-end gap-4 border-b border-separator-border bg-background-primary-default px-4 py-3 sm:px-6"><div className="min-w-0 text-right"><p className="truncate text-body-2-medium text-text-primary">{user.name}</p><p className="truncate text-caption-1-regular text-text-secondary">{user.email}</p></div><AccountActions/></header>;
}
