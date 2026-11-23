import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { scriptLabRetiredSection, scriptLabSectionFromSlug, scriptLabSectionPath } from "@/lib/script-lab-navigation";
import { CustomerProjectPage } from "../../customer-project-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Biceek · AI Script Lab",
  description: "Preview Biceek’s Findhoo 200 video concepts and scripts.",
};

export default async function Page({ params }: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const retired = scriptLabRetiredSection(slug);
  if (retired) redirect(scriptLabSectionPath(retired, true));
  const section = scriptLabSectionFromSlug(slug);
  if (!section) notFound();
  return <CustomerProjectPage section={section} />;
}
