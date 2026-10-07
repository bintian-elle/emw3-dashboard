import { RiGoogleFill } from "@remixicon/react";
import { ButtonLink } from "@/components/base/buttons/button";

export function AccessForm({ returnTo }: { returnTo: string }) {
  return <div className="mt-8"><ButtonLink className="w-full" leadingIcon={RiGoogleFill} href={`/api/auth/google?returnTo=${encodeURIComponent(returnTo)}`}>Sign in with Google</ButtonLink></div>;
}
