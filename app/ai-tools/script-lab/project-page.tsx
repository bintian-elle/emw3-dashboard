import { createHash } from "node:crypto";
import { Suspense } from "react";
import { currentSiteUser } from "@/lib/current-site-user";
import { notFound } from "next/navigation";
import type { ScriptLabSection } from "@/lib/script-lab-navigation";
import { loadScriptLabProject } from "@/lib/script-lab-store";
import ScriptLabWorkbench from "./workbench";

type Props = {
  visibility: "public" | "internal";
  section: ScriptLabSection;
  customerProfile?: Promise<{ email: string } | null>;
};

export function ScriptLabProjectPage(props: Props) {
  if (props.section === "trends") {
    return <ScriptLabWorkbench section="trends" publicView={props.visibility === "public"} canManageRules={false} />;
  }

  return <Suspense fallback={props.section === "generator"
    ? <ScriptLabWorkbench section="generator" publicView={props.visibility === "public"} canManageRules={false} projectLoading />
    : null}>
    <LoadedProjectPage {...props} />
  </Suspense>;
}

async function LoadedProjectPage({ visibility, section, customerProfile }: Props) {
  const identity = visibility === "public"
    ? customerProfile
    : section === "generator" || section === "candidates" ? currentSiteUser() : undefined;
  const project = await loadScriptLabProject(visibility).catch((error: unknown) => {
    console.error("Script Lab project unavailable:", error instanceof Error ? error.name : "Unknown error");
    return undefined;
  });

  if (project === null) notFound();
  if (!project && section !== "generator") {
    return <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">AI Script Lab</h1>
      <p className="mt-3">The project is temporarily unavailable. Please reload to try again.</p>
    </div>;
  }

  const ruleSourceUrl = visibility === "internal"
    ? "https://docs.google.com/spreadsheets/d/1Q5E40sCbMJDxbTKpntynfq9rStXwT3UI-GwjEGoO-lo/edit?gid=1039304094#gid=1039304094"
    : undefined;
  const user = await identity;
  const selectionScope = user?.email
    ? createHash("sha256").update(user.email.trim().toLowerCase()).digest("hex")
    : visibility === "public" ? "public-guest" : "internal-local";
  return <ScriptLabWorkbench key={selectionScope} selectionScope={selectionScope} project={project} publicView={visibility === "public"} canManageRules={visibility === "internal" || Boolean(user)} section={section} ruleSourceUrl={ruleSourceUrl} />;
}
