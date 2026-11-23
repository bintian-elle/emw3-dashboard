import { redirect } from "next/navigation";
import { scriptLabLegacySection, scriptLabSectionPath } from "@/lib/script-lab-navigation";

export default async function ScriptLabIndex({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  redirect(scriptLabSectionPath(scriptLabLegacySection(view), false));
}
