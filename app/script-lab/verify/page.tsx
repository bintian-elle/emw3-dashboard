import type { Metadata } from "next";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = { title: "Verify your email · AI Script Lab", referrer: "no-referrer" };

export default function VerifyEmailPage() {
  return <VerifyEmailForm />;
}
