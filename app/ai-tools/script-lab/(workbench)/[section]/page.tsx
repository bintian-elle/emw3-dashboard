import { notFound, redirect } from "next/navigation";
import { scriptLabRetiredSection, scriptLabSectionFromSlug, scriptLabSectionPath } from "@/lib/script-lab-navigation";
import { ScriptLabProjectPage } from "../../project-page";

export const dynamic = "force-dynamic";

export default async function Page({ params }: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const retired = scriptLabRetiredSection(slug);
  if (retired) redirect(scriptLabSectionPath(retired, false));
  const section = scriptLabSectionFromSlug(slug);
  if (!section) notFound();
  return <ScriptLabProjectPage visibility="internal" section={section} />;
}
